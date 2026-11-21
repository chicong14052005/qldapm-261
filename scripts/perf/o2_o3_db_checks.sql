-- Doi chieu O2/O3 truc tiep trong PostgreSQL. CHI DOC (SELECT), khong sua du lieu.
-- Chay (PowerShell): Get-Content scripts/perf/o2_o3_db_checks.sql | docker compose exec -T postgres psql -U restaurant -d restaurant
-- Moi truy van tra ve so "vi pham"; ky vong tat ca = 0.

\echo '== O2: moi don toi da 1 payment (khong thu tien trung)'
SELECT count(*) AS orders_with_multiple_payments FROM (
  SELECT order_id FROM payments GROUP BY order_id HAVING count(*) > 1) x;

\echo '== O2: moi ban toi da 1 luot OPEN'
SELECT count(*) AS tables_with_multiple_open_visits FROM (
  SELECT table_id FROM visits WHERE status = 'OPEN' GROUP BY table_id HAVING count(*) > 1) x;

\echo '== O2: moi luot toi da 1 don'
SELECT count(*) AS visits_with_multiple_orders FROM (
  SELECT visit_id FROM orders WHERE visit_id IS NOT NULL GROUP BY visit_id HAVING count(*) > 1) x;

\echo '== O2: mot Idempotency-Key chi co 1 ban ghi cho moi nguoi gui'
SELECT count(*) AS duplicated_idempotency_keys FROM (
  SELECT key, actor_staff_id, actor_guest_session_id FROM idempotency_records
  GROUP BY key, actor_staff_id, actor_guest_session_id HAVING count(*) > 1) x;

\echo '== O2: dot bi trung nghi van (cung don, cung noi dung, cach nhau < 2 giay) - can xem tay neu > 0'
WITH b AS (
  SELECT ob.id, ob.order_id, ob.created_at,
         string_agg(oi.menu_item_id::text || 'x' || oi.quantity || ':' || coalesce(oi.note, ''), ',' ORDER BY oi.menu_item_id, oi.quantity, oi.note) AS content
  FROM order_batches ob JOIN order_items oi ON oi.batch_id = ob.id GROUP BY ob.id)
SELECT count(*) AS suspicious_duplicate_batches FROM b b1 JOIN b b2
  ON b1.order_id = b2.order_id AND b1.id < b2.id AND b1.content = b2.content
 AND abs(extract(epoch FROM b2.created_at - b1.created_at)) < 2;

\echo '== O3: mon huy khi dang/sau che bien ma khong co ly do'
SELECT count(*) AS cooked_cancel_without_reason FROM audit_events
WHERE action = 'ITEM_CANCEL' AND target_type = 'ORDER_ITEM'
  AND before_data ->> 'status' IN ('PREPARING', 'READY')
  AND (reason IS NULL OR btrim(reason) = '');

\echo '== O3 (tham khao): tong so lan huy mon sau khi da bat dau nau'
SELECT count(*) AS total_cancel_events_after_cooking FROM audit_events
WHERE action = 'ITEM_CANCEL' AND before_data ->> 'status' IN ('PREPARING', 'READY');

\echo '== O4: payment lech tong don da chot'
SELECT count(*) AS payments_amount_mismatch FROM payments p JOIN orders o ON o.id = p.order_id
WHERE o.total_vnd IS DISTINCT FROM p.amount_vnd;

\echo '== O4: tong don PAID khac tong cac mon SERVED theo gia snapshot'
SELECT count(*) AS paid_orders_total_mismatch FROM orders o
WHERE o.status = 'PAID' AND o.total_vnd <> coalesce((
  SELECT sum(oi.unit_price_vnd * oi.quantity) FROM order_batches ob JOIN order_items oi ON oi.batch_id = ob.id
  WHERE ob.order_id = o.id AND oi.status = 'SERVED'), 0);
