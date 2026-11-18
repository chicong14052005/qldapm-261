# Trigger functions hiện hành

Được đọc từ PostgreSQL catalog sau `202611180005_SingleActiveGuestPerVisit`; không thực thi SQL trong tài liệu này. [Danh mục bảng](README.md).

SQL được giữ nguyên để tra cứu điều kiện thực tế. `BEFORE` kiểm ngay trên từng dòng; constraint trigger `DEFERRABLE INITIALLY DEFERRED` kiểm khi transaction commit. Không tuyên bố trigger bao phủ mọi phân quyền hoặc mọi validation API.

## `check_business_integrity`

Kiểm liên kết visit/order, batch có 1–50 dòng, batch/item khớp trạng thái, tổng checkout bằng dòng SERVED và payment tồn tại iff order PAID. Deferred đến commit để transaction tạo nhiều bản ghi hợp lệ có thể hoàn tất.

```sql
CREATE OR REPLACE FUNCTION public.check_business_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
 IF EXISTS(SELECT 1 FROM visits v LEFT JOIN orders o ON o.visit_id=v.id WHERE o.id IS NULL OR
 (v.status='OPEN' AND o.status NOT IN ('SERVING','AWAITING_PAYMENT')) OR (v.status='CLOSED' AND o.status<>'PAID') OR (v.status='CANCELLED' AND o.status<>'CANCELLED')) THEN
 RAISE EXCEPTION 'visit and order must agree' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM order_batches b WHERE (SELECT count(*) FROM order_items i WHERE i.batch_id=b.id) NOT BETWEEN 1 AND 50) THEN
 RAISE EXCEPTION 'batch must have 1 to 50 items' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM order_items i JOIN order_batches b ON b.id=i.batch_id WHERE
 (b.status='PENDING' AND i.status<>'PENDING_APPROVAL') OR (b.status='REJECTED' AND i.status<>'REJECTED') OR
 (b.status='WITHDRAWN' AND i.status<>'CANCELLED') OR (b.status='APPROVED' AND i.status IN ('PENDING_APPROVAL','REJECTED'))) THEN
 RAISE EXCEPTION 'batch and items must agree' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM orders o WHERE o.status IN ('AWAITING_PAYMENT','PAID') AND (
 NOT EXISTS(SELECT 1 FROM order_batches b WHERE b.order_id=o.id) OR
 EXISTS(SELECT 1 FROM order_batches b WHERE b.order_id=o.id AND b.status='PENDING') OR
 EXISTS(SELECT 1 FROM order_items i JOIN order_batches b ON b.id=i.batch_id WHERE b.order_id=o.id AND i.status NOT IN ('SERVED','CANCELLED','REJECTED')) OR
 o.total_vnd<>(SELECT coalesce(sum(i.quantity::numeric*i.unit_price_vnd),0) FROM order_items i JOIN order_batches b ON b.id=i.batch_id WHERE b.order_id=o.id AND i.status='SERVED'))) THEN
 RAISE EXCEPTION 'checkout total or item state mismatch' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM orders o LEFT JOIN payments p ON p.order_id=o.id WHERE (o.status='PAID' AND (p.id IS NULL OR p.amount_vnd<>o.total_vnd)) OR (o.status<>'PAID' AND p.id IS NOT NULL)) THEN
 RAISE EXCEPTION 'payment and order must agree' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $function$
```

## `check_item_transition`

Chỉ UPDATE item khi order SERVING; giữ snapshot/quan hệ bất biến, kiểm sửa số lượng/ghi chú và chuyển trạng thái hợp lệ.

```sql
CREATE OR REPLACE FUNCTION public.check_item_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE order_status text;
BEGIN
 SELECT o.status INTO order_status FROM orders o JOIN order_batches b ON b.order_id=o.id WHERE b.id=NEW.batch_id;
 IF order_status<>'SERVING' THEN RAISE EXCEPTION 'order is closed for changes' USING ERRCODE='23514'; END IF;
 IF (NEW.batch_id,NEW.menu_item_id,NEW.menu_code_snapshot,NEW.menu_name_snapshot,NEW.unit_price_vnd) IS DISTINCT FROM
 (OLD.batch_id,OLD.menu_item_id,OLD.menu_code_snapshot,OLD.menu_name_snapshot,OLD.unit_price_vnd) THEN
 RAISE EXCEPTION 'item snapshots are immutable' USING ERRCODE='23514'; END IF;
 IF NEW.status=OLD.status THEN
   IF NEW.quantity<>OLD.quantity OR NEW.note IS DISTINCT FROM OLD.note THEN
     IF OLD.status NOT IN ('PLACED','ACCEPTED') OR NEW.quantity>OLD.quantity THEN RAISE EXCEPTION 'item cannot be amended' USING ERRCODE='23514'; END IF;
   END IF;
 ELSE
 IF NOT ((OLD.status='PENDING_APPROVAL' AND NEW.status IN ('PLACED','CANCELLED','REJECTED')) OR
 (OLD.status='PLACED' AND NEW.status IN ('ACCEPTED','CANCELLED')) OR (OLD.status='ACCEPTED' AND NEW.status IN ('PREPARING','CANCELLED')) OR
 (OLD.status='PREPARING' AND NEW.status IN ('READY','CANCELLED')) OR (OLD.status='READY' AND NEW.status IN ('SERVED','CANCELLED'))) THEN
 RAISE EXCEPTION 'invalid item transition' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $function$
```

## `check_version`

Mọi UPDATE của 8 bảng Mutable phải tăng version đúng 1; updated_at không trước created_at. Hàm không tự sửa dữ liệu.

```sql
CREATE OR REPLACE FUNCTION public.check_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
 IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'version must increase by one' USING ERRCODE='23514'; END IF;
 IF NEW.updated_at<NEW.created_at THEN RAISE EXCEPTION 'invalid timestamps' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $function$
```

## `guard_batch`

Chỉ quyết định batch PENDING một lần, giữ identity, kiểm tự duyệt và guest đúng visit. Không tự kiểm toàn bộ role được duyệt; service có Require.

```sql
CREATE OR REPLACE FUNCTION public.guard_batch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE guest_visit uuid; order_visit uuid;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF OLD.status<>'PENDING' OR NEW.status NOT IN ('APPROVED','REJECTED','WITHDRAWN') THEN RAISE EXCEPTION 'batch decision is final' USING ERRCODE='23514'; END IF;
    IF (NEW.order_id,NEW.sequence_no,NEW.submitted_by_staff_id,NEW.submitted_by_guest_session_id) IS DISTINCT FROM (OLD.order_id,OLD.sequence_no,OLD.submitted_by_staff_id,OLD.submitted_by_guest_session_id) THEN RAISE EXCEPTION 'batch identity is immutable' USING ERRCODE='23514'; END IF;
  END IF;
  IF NEW.reviewed_by_staff_id=NEW.submitted_by_staff_id AND NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=NEW.reviewed_by_staff_id AND role_code IN ('MANAGER','ADMIN')) THEN RAISE EXCEPTION 'only manager or admin may self review' USING ERRCODE='23514'; END IF;
  IF NEW.submitted_by_guest_session_id IS NOT NULL THEN
    SELECT visit_id INTO guest_visit FROM guest_sessions WHERE id=NEW.submitted_by_guest_session_id;
    SELECT visit_id INTO order_visit FROM orders WHERE id=NEW.order_id;
    IF guest_visit IS DISTINCT FROM order_visit OR order_visit IS NULL THEN RAISE EXCEPTION 'guest belongs to another visit' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$
```

## `guard_order`

Giữ identity order; chặn UPDATE đơn terminal, kiểm chuyển trạng thái và chặn hủy order đã có audit chế biến/bàn giao.

```sql
CREATE OR REPLACE FUNCTION public.guard_order()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (NEW.code,NEW.order_type,NEW.visit_id,NEW.pickup_code,NEW.created_by_staff_id) IS DISTINCT FROM (OLD.code,OLD.order_type,OLD.visit_id,OLD.pickup_code,OLD.created_by_staff_id) THEN RAISE EXCEPTION 'order identity is immutable' USING ERRCODE='23514'; END IF;
  IF OLD.status IN ('PAID','CANCELLED') THEN RAISE EXCEPTION 'terminal order is immutable' USING ERRCODE='23514'; END IF;
  IF NEW.status<>OLD.status AND NOT ((OLD.status='SERVING' AND NEW.status IN ('AWAITING_PAYMENT','CANCELLED')) OR (OLD.status='AWAITING_PAYMENT' AND NEW.status IN ('SERVING','PAID'))) THEN RAISE EXCEPTION 'invalid order transition' USING ERRCODE='23514'; END IF;
  IF NEW.status='CANCELLED' AND EXISTS(SELECT 1 FROM audit_events a JOIN order_items i ON i.id=a.target_id JOIN order_batches b ON b.id=i.batch_id WHERE b.order_id=NEW.id AND a.target_type='ORDER_ITEM' AND a.action IN ('ITEM_PREPARE','ITEM_READY','ITEM_SERVE')) THEN RAISE EXCEPTION 'prepared order requires settlement' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $function$
```

## `guard_paid_order_history_delete`

Chặn DELETE mọi batch/item của order PAID, kể cả dòng không tính tiền. Giữ chi tiết cho admin tra cứu.

```sql
CREATE OR REPLACE FUNCTION public.guard_paid_order_history_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE parent_order uuid;
BEGIN
  IF TG_TABLE_NAME='order_batches' THEN parent_order=OLD.order_id;
  ELSE SELECT order_id INTO parent_order FROM order_batches WHERE id=OLD.batch_id;
  END IF;
  IF EXISTS(SELECT 1 FROM orders WHERE id=parent_order AND status='PAID') THEN
    RAISE EXCEPTION 'paid order history must be retained' USING ERRCODE='23514';
  END IF;
  RETURN OLD;
END $function$
```

## `guard_payment_recipient`

INSERT payment phải có snapshot username/tên khớp staff đang được khóa FOR SHARE. Không kiểm role CASHIER tại trigger; service kiểm role.

```sql
CREATE OR REPLACE FUNCTION public.guard_payment_recipient()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE recipient_username text; recipient_name text;
BEGIN
  SELECT username,display_name INTO recipient_username,recipient_name
    FROM staff_users WHERE id=NEW.received_by_staff_id FOR SHARE;
  IF NEW.received_by_username_snapshot IS NULL OR NEW.received_by_display_name_snapshot IS NULL OR
    NEW.received_by_username_snapshot IS DISTINCT FROM recipient_username OR
    NEW.received_by_display_name_snapshot IS DISTINCT FROM recipient_name THEN
    RAISE EXCEPTION 'payment recipient snapshot must match staff at payment time' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $function$
```

## `guard_table`

Không đổi code/capacity/is_active khi có visit OPEN; QR rotate là use case riêng.

```sql
CREATE OR REPLACE FUNCTION public.guard_table()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (NEW.code,NEW.capacity,NEW.is_active) IS DISTINCT FROM (OLD.code,OLD.capacity,OLD.is_active) AND EXISTS(SELECT 1 FROM visits WHERE table_id=NEW.id AND status='OPEN') THEN RAISE EXCEPTION 'occupied table cannot change' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $function$
```

## `guard_visit`

Bản hiện hành từ migration003: INSERT khóa bàn, kiểm active/capacity; UPDATE giữ table_id và chỉ sửa từ OPEN. Không còn join_generation.

```sql
CREATE OR REPLACE FUNCTION public.guard_visit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE table_capacity smallint; table_active boolean;
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT capacity,is_active INTO table_capacity,table_active FROM restaurant_tables WHERE id=NEW.table_id FOR UPDATE;
    IF NOT table_active OR NEW.party_size>table_capacity THEN RAISE EXCEPTION 'table unavailable or capacity exceeded' USING ERRCODE='23514'; END IF;
  ELSE
    IF NEW.table_id<>OLD.table_id OR OLD.status<>'OPEN' THEN RAISE EXCEPTION 'invalid visit change' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $function$
```

## `reject_mutation`

Chặn UPDATE/DELETE payments và audit_events bằng lỗi 23514; không phải cơ chế chống PostgreSQL superuser.

```sql
CREATE OR REPLACE FUNCTION public.reject_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ BEGIN RAISE EXCEPTION 'append only record' USING ERRCODE='23514'; END $function$
```
