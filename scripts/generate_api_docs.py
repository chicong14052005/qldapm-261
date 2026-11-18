"""Generate one Markdown file per actual endpoint plus a Postman collection.
Examples are maintained here; routes are read from Program.cs so missing docs fail fast.
This describes transport/testing only; business rules remain in SSOT.
"""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'api';OUT.mkdir(parents=True,exist_ok=True)
V={'expectedVersion':1}; OV={'expectedOrderVersion':1}
ROW={'menuItemId':'30000000-0000-0000-0000-000000000006','quantity':2,'observedPriceVnd':95000,'note':'Ít cay, không hành'}
SPEC={}
def add(method,path,title,role,body,response,ssot,notes=''):
    SPEC[(method,path)]=(title,role,body,response,ssot,notes)
add('GET','/health/live','Kiểm tra tiến trình','Công khai',None,{'status':'ok'},None)
add('GET','/health/ready','Kiểm tra kết nối database','Công khai',None,{'status':'ready'},None)
add('GET','/api/v1/auth/csrf','Lấy CSRF token','Công khai',None,{'token':'<token do server trả về>'},'P1.1','Cookie CSRF được lưu trong cookie jar. Lấy token mới sau khi đăng nhập/đăng xuất hoặc đổi principal. Không dùng chuỗi minh họa làm token thật.')
add('POST','/api/v1/auth/login','Đăng nhập nhân viên','Công khai',{'username':'admin','password':'RestaurantDemo!2026'},{'id':'10000000-0000-0000-0000-000000000005','username':'admin','displayName':'Quản trị hệ thống','roles':['ADMIN'],'isActive':True,'mustChangePassword':False,'version':1},'P1.1','Seed local có admin, manager, waiter, kitchen, cashier cùng mật khẩu DEMO_PASSWORD. Cookie ros_staff là HttpOnly; Postman giữ tự động. Mật khẩu ví dụ chỉ dành cho môi trường demo localhost.')
add('GET','/api/v1/auth/me','Đọc phiên hiện tại','Nhân viên hoặc khách đúng phiên',None,{'id':'10000000-0000-0000-0000-000000000005','displayName':'Quản trị hệ thống','roles':['ADMIN'],'isGuest':False,'visitId':None,'mustChangePassword':False},'P1.1')
add('POST','/api/v1/auth/logout','Đăng xuất','Phiên hiện tại',{}, {'success':True},'P1.1')
add('POST','/api/v1/auth/change-password','Đổi mật khẩu','Nhân viên',{'currentPassword':'RestaurantDemo!2026','newPassword':'BepNhaNewPass!2026'},{'success':True},'P1.1','Thu hồi các phiên cũ và cấp lại cookie phiên hiện tại. Mật khẩu mới 12–128 ký tự. Đừng gửi ví dụ này nếu muốn giữ nguyên password demo.')
add('GET','/api/v1/staff','Danh sách nhân viên','ADMIN',None,{'items':[{'username':'waiter','displayName':'Nhân viên phục vụ','roles':['WAITER'],'isActive':True,'mustChangePassword':False,'version':1}],'nextCursor':None},'P1.1')
add('POST','/api/v1/staff','Tạo nhân viên','ADMIN',{'username':'phucvu02','displayName':'Nguyễn Minh Anh','initialPassword':'MinhAnhDemo!2026','roles':['WAITER']},{'id':'<id mới>','username':'phucvu02','displayName':'Nguyễn Minh Anh','roles':['WAITER'],'isActive':True,'mustChangePassword':True,'version':1},'P1.1')
add('PATCH','/api/v1/staff/{id}','Sửa/khóa nhân viên','ADMIN',{**V,'displayName':'Nguyễn Minh Anh','active':False},{'id':'<staffId>','isActive':False,'version':2},'P1.1','Không khóa admin active cuối cùng. Khóa/đổi quyền/reset thu hồi phiên. Ví dụ response rút gọn, response thật còn username/displayName/roles/mustChangePassword.')
add('PUT','/api/v1/staff/{id}/roles','Thay bộ vai trò nhân viên','ADMIN',{**V,'roles':['WAITER','CASHIER']},{'id':'<staffId>','roles':['WAITER','CASHIER'],'version':2},'P1.1','roles là bộ đầy đủ thay thế, không phải chỉ các role bổ sung.')
add('POST','/api/v1/staff/{id}/reset-password','Đặt mật khẩu tạm','ADMIN',{**V,'temporaryPassword':'TemporaryPass!2026'},{'id':'<staffId>','mustChangePassword':True,'version':2},'P1.1')
MENU={'id':ROW['menuItemId'],'categoryId':'20000000-0000-0000-0000-000000000002','code':'MON-006','name':'Cơm chiên hải sản','description':'Cơm chiên tơi với tôm, mực và rau củ.','imageUrl':'/menu/placeholder.svg','priceVnd':95000,'isActive':True,'isAvailable':True,'version':1}
add('GET','/api/v1/menu','Xem thực đơn','Công khai',None,{'categories':[{'id':MENU['categoryId'],'name':'Món chính','sortOrder':1,'isActive':True,'version':1}],'items':[MENU],'serverTime':'2026-11-02T15:00:00Z'},'P1.2','Query tùy chọn: categoryId=<UUID>, search=Cơm. Response chỉ danh mục/món active; món hết vẫn hiển thị. Món và danh mục còn createdAt/updatedAt trong response thật.')
add('GET','/api/v1/manage/menu-items','Xem cả món ẩn','MANAGER / ADMIN',None,{'categories':[],'items':[MENU],'serverTime':'2026-11-02T15:00:00Z'},'P1.2','Cùng shape menu, gồm danh mục/món inactive.')
category={'code':'CAT-5','name':'Tráng miệng','sortOrder':4,'isActive':True}
add('POST','/api/v1/menu-categories','Thêm danh mục','MANAGER / ADMIN',category,{'id':'<categoryId>',**category,'version':1},'P1.2')
add('PATCH','/api/v1/menu-categories/{id}','Sửa/ẩn danh mục','MANAGER / ADMIN',{**V,'name':'Tráng miệng theo mùa','isActive':True},{'id':'<categoryId>','name':'Tráng miệng theo mùa','isActive':True,'version':2},'P1.2','Chỉ gửi các trường cần sửa ngoài expectedVersion. Danh mục inactive chặn món mới nhưng không hủy món cũ.')
menu_new={k:v for k,v in MENU.items() if k not in ['id','version','isAvailable']};menu_new.update(code='MON-021',name='Lẩu nấm chay',priceVnd=159000,description='Nấm tươi, rau theo mùa và nước dùng thanh ngọt.')
add('POST','/api/v1/menu-items','Thêm món ăn','MANAGER / ADMIN',menu_new,{'id':'<menuItemId>',**menu_new,'isAvailable':True,'version':1},'P1.2')
add('PATCH','/api/v1/menu-items/{id}','Sửa/ẩn món','MANAGER / ADMIN',{**V,'priceVnd':99000,'isActive':True},{**MENU,'priceVnd':99000,'version':2},'P1.2','Giá và tên các dòng order đã gửi không thay đổi. imageUrl nhận /menu/... không chứa .. hoặc HTTPS.')
add('PATCH','/api/v1/menu-items/{id}/availability','Bật/tắt còn món','KITCHEN / MANAGER / ADMIN',{**V,'isAvailable':False},{**MENU,'isAvailable':False,'version':2},'P1.2','Đổi sang hết chặn submit/approve mới; không chặn chế biến món đã duyệt.')
add('GET','/api/v1/tables','Sơ đồ bàn và lượt đang mở','Nhân viên',None,{'items':[{'id':'40000000-0000-0000-0000-000000000001','code':'B01','capacity':4,'isActive':True,'version':1,'visit':None}]},'P1.3','Bàn có khách: visit={id,partySize,version,orderId,hasActiveGuestSession}. Không trả QR hash, joinCode hoặc join HMAC.')
add('POST','/api/v1/tables','Thêm bàn','MANAGER / ADMIN',{'code':'B31','capacity':4,'isActive':True},{'id':'<tableId>','code':'B31','capacity':4,'isActive':True,'version':1},'P1.3')
add('PATCH','/api/v1/tables/{id}','Sửa/ẩn bàn trống','MANAGER / ADMIN',{**V,'code':'B01','capacity':6,'isActive':True},{'id':'<tableId>','code':'B01','capacity':6,'isActive':True,'version':2},'P1.3','Không sửa bàn đang có lượt OPEN.')
add('POST','/api/v1/tables/{id}/qr/rotate','Thay QR cố định khi cần vô hiệu link cũ','MANAGER / ADMIN',V,{'id':'<tableId>','code':'B01','version':2,'qrToken':'<token thực server sinh>','qrPath':'/qr/<token>','qrUrl':'http://localhost:3000/qr/<token>'},'P1.3','Chỉ thay khi cần vô hiệu QR/link đã in. Muốn xem lại QR hiện tại, dùng GET tables/{id}/qr; không gọi rotate mỗi lần xem. URL đầy đủ dùng PublicOrigin. Thay QR không thu hồi guest session đã tham gia đúng lượt; đóng lượt vẫn thu hồi như cũ.')
add('POST','/api/v1/tables/{id}/qr/unlock','Mở khóa QR bàn đang có khách để cấp phiên mới','WAITER / MANAGER / ADMIN',{},{'visitId':'<visitId>','orderId':'<orderId>','tableCode':'B01','revokedCount':1},'P1.3','Thu hồi guest session đang hoạt động của lượt OPEN hiện tại mà không đóng lượt hoặc mất đơn, giúp một thiết bị khác tại bàn quét lại QR khi máy cũ lỡ mất phiên/hết pin.')
add('GET','/api/v1/tables/{id}/qr','Xem lại QR và URL cố định của bàn','WAITER / MANAGER / ADMIN',None,{'id':'<tableId>','code':'B01','version':1,'qrToken':'<token cố định>','qrPath':'/qr/<token>','qrUrl':'http://localhost:3000/qr/<token>'},'P1.3','GET chỉ đọc, không đổi token/version. QR dùng lại qua nhiều lượt và restart. UI sinh ảnh QR từ đúng qrUrl này, có ô URL và nút sao chép. Không cần joinCode. PublicOrigin xác định host/port trong link.')
add('GET','/api/v1/qr/{token}','Đọc thông tin QR công khai','Công khai',None,{'tableCode':'B01','hasOpenVisit':True,'hasActiveGuestSession':False},'P1.3')
add('POST','/api/v1/tables/{id}/visits','Mở lượt khách','WAITER / MANAGER / ADMIN',{'partySize':2},{'visitId':'<visitId>','orderId':'<orderId>','tableCode':'B01','version':1,'orderVersion':1},'P1.3','partySize từ 1 tới sức chứa. Một bàn chỉ một lượt OPEN. Không cần mã tham gia. Retry cùng key trả cùng lượt/order.')
add('POST','/api/v1/guest/join','Khách tham gia lượt đang mở bằng QR cố định','Công khai',{'qrToken':'{{qrToken}}'},{'visitId':'<visitId>','orderId':'<orderId>','tableCode':'B01'},'P1.3','Lưu cookie ros_guest. Khi cookie staff cũng có trong Postman, gửi X-Actor: guest cho request khách. Giới hạn 60 lần/phút/IP. Không nhập mã. Bàn chưa mở trả 409 TABLE_NOT_OPEN; bàn đã có thực khách đang giữ phiên trả 409 TABLE_QR_CLAIMED (trừ khi thực khách đó bấm Thoát hoặc nhân viên gọi POST /tables/{id}/qr/unlock); QR sai/bàn inactive trả 404. Gọi lại bằng cùng cookie hợp lệ giữ cùng phiên/lượt; không tạo order mới.')
add('GET','/api/v1/guest/current','Lượt hiện tại của khách','CUSTOMER + X-Actor: guest',None,{'visitId':'<visitId>','orderId':'<orderId>','tableCode':'B01'},'P1.3')
add('GET','/api/v1/orders','Danh sách đơn','Nhân viên',None,{'items':[{'id':'<orderId>','code':'DH-4C8AA1B2C3D4','orderType':'DINE_IN','status':'SERVING','version':1,'tableCode':'B01','pickupCode':None,'pickupName':None,'totalVnd':None,'createdAt':'2026-11-02T15:00:00Z'}]},'P1.4','Query status=PAID hoặc CANCELLED để xem lịch sử; mặc định SERVING/AWAITING_PAYMENT. Bản local trả tối đa 200 đơn gần nhất, chưa cursor pagination.')
ORDER={'id':'<orderId>','code':'DH-4C8AA1B2C3D4','orderType':'DINE_IN','tableCode':'B01','visitId':'<visitId>','pickupCode':None,'pickupName':None,'status':'SERVING','version':2,'totalVnd':None,'subtotalVnd':190000,'pendingVnd':0,'createdAt':'2026-11-02T15:00:00Z','batches':[{'id':'<batchId>','sequenceNo':1,'status':'APPROVED','version':1,'createdAt':'2026-11-02T15:01:00Z','decisionReason':None,'reviewedAt':None,'eligibleAt':'2026-11-02T15:01:00Z','submittedByStaffId':None,'items':[{'id':'<itemId>','batchId':'<batchId>','menuItemId':ROW['menuItemId'],'menuCodeSnapshot':'MON-006','menuNameSnapshot':'Cơm chiên hải sản','quantity':2,'unitPriceVnd':95000,'note':'Ít cay, không hành','status':'PLACED','version':1,'statusChangedAt':'2026-11-02T15:01:00Z','createdAt':'2026-11-02T15:01:00Z','updatedAt':'2026-11-02T15:01:00Z'}]}]}
add('GET','/api/v1/orders/{id}','Chi tiết đơn và mọi đợt gọi','Nhân viên hoặc CUSTOMER đúng lượt',None,ORDER,'P1.4','Luôn đọc lại version trước command. totalVnd chỉ chốt khi AWAITING_PAYMENT/PAID; subtotalVnd chưa bao gồm pending/cancelled/rejected.')
add('POST','/api/v1/takeaway-orders','Tạo đơn mang về và đợt đầu','WAITER / CASHIER / MANAGER / ADMIN',{'pickupName':'Nguyễn Minh Anh','items':[ROW]},{'orderId':'<orderId>','code':'DH-A817B21C9D32','pickupCode':'MV-8BC179D2','orderVersion':1,'batchId':'<batchId>','status':'APPROVED','version':1},'P1.4','Không tableId/visitId. pickupName tùy chọn, không bắt buộc số điện thoại. Đợt đầu tự duyệt; chỉ thu tiền sau bàn giao.')
add('POST','/api/v1/orders/{id}/batches','Gửi đợt món đầu/gọi thêm','CUSTOMER đúng lượt / WAITER / MANAGER / ADMIN; CASHIER cho takeaway',{**OV,'items':[ROW]},{'orderId':'<orderId>','orderVersion':2,'batchId':'<batchId>','status':'APPROVED','version':1},'P1.4','Đợt đầu APPROVED; sequence>1 PENDING dù cùng món lần trước hoặc người gửi là manager. items 1–50 dòng; quantity 1–99. observedPriceVnd phải khớp giá menu lúc gửi. Payload khác với cùng key trả 409.')
add('GET','/api/v1/approval-batches','Đợt gọi thêm chờ duyệt','KITCHEN / MANAGER / ADMIN',None,{'items':[{'id':'<batchId>','orderId':'<orderId>','sequenceNo':2,'version':1,'createdAt':'2026-11-02T15:05:00Z','submittedByStaffId':None,'orderCode':'DH-4C8AA1B2C3D4','destination':'B01','items':ORDER['batches'][0]['items']}]},'P1.4','Luôn trả các batch PENDING; chưa hỗ trợ lọc trạng thái khác.')
for action,title in [('approve','Duyệt toàn đợt'),('reject','Từ chối toàn đợt'),('withdraw','Rút toàn đợt chờ')]:
    role='CUSTOMER đúng lượt / nhân viên có quyền sửa đơn' if action=='withdraw' else 'KITCHEN / MANAGER / ADMIN'
    body={**V,**({'reason':'Khách đã đổi ý, không gọi thêm.'} if action=='reject' else {})}
    add('POST',f'/api/v1/batches/{{id}}/{action}',title,role,body,{'id':'<batchId>','status':{'approve':'APPROVED','reject':'REJECTED','withdraw':'WITHDRAWN'}[action],'version':2,'orderVersion':4},'P1.4','expectedVersion là version batch. Manager/admin được tự duyệt; bếp không tự duyệt đợt mình gửi. Duyệt kiểm còn món và danh mục active, giữ snapshot giá lúc gửi.' if action=='approve' else 'Không tác động batch đã có quyết định; rút/từ chối không tính tiền và không đưa món xuống bếp.')
QUEUE={'items':[{'id':'<itemId>','batchId':'<batchId>','menuItemId':ROW['menuItemId'],'menuNameSnapshot':'Cơm chiên hải sản','quantity':2,'note':'Ít cay, không hành','status':'PLACED','version':1,'statusChangedAt':'2026-11-02T15:01:00Z','sequenceNo':1,'eligibleAt':'2026-11-02T15:01:00Z','orderId':'<orderId>','orderCode':'DH-4C8AA1B2C3D4','orderType':'DINE_IN','destination':'B01'}],'serverTime':'2026-11-02T15:01:01Z'}
add('GET','/api/v1/kitchen/items','Hàng đợi chế biến','KITCHEN / MANAGER / ADMIN',None,QUEUE,'P1.5','FIFO theo eligibleAt, chỉ batch APPROVED. Bản local trả toàn bộ queue đang hoạt động, chưa phân trang/lọc category/status.')
add('GET','/api/v1/kitchen/changes','Lịch sử sửa/hủy gần đây','KITCHEN / MANAGER / ADMIN',None,{'items':[{'id':'<auditId>','targetId':'<itemId>','action':'ITEM_CANCEL','beforeData':'{"status":"ACCEPTED"}','afterData':'{"status":"CANCELLED"}','reason':'Khách đổi món trước khi nấu.','occurredAt':'2026-11-02T15:06:00Z'}]},'P1.5','100 thay đổi sửa/hủy gần nhất trong 15 phút; beforeData/afterData hiện là JSON string. Danh sách queue là nguồn trạng thái hiện tại, không dùng audit như message queue.')
for action,next_status,role in [('accept','ACCEPTED','KITCHEN / MANAGER / ADMIN'),('prepare','PREPARING','KITCHEN / MANAGER / ADMIN'),('ready','READY','KITCHEN / MANAGER / ADMIN'),('serve','SERVED','WAITER / MANAGER / ADMIN; CASHIER chỉ takeaway'),('cancel','CANCELLED','Khách/nhân viên đúng quyền trước chuẩn bị; MANAGER/ADMIN khi PREPARING/READY')]:
    add('POST',f'/api/v1/order-items/{{id}}/{action}',{'accept':'Bếp tiếp nhận món','prepare':'Bắt đầu chuẩn bị','ready':'Bếp hoàn thành món','serve':'Xác nhận bàn giao món','cancel':'Hủy dòng món'}[action],role,{**V,**({'reason':'Khách dị ứng thành phần, quản lý đồng ý hủy.'} if action=='cancel' else {})},{'id':'<itemId>','status':next_status,'quantity':2,'note':'Ít cay, không hành','version':2,'orderVersion':5},'P1.6' if action=='serve' else 'P1.4' if action=='cancel' else 'P1.5','expectedVersion là version item. Luồng PLACED→ACCEPTED→PREPARING→READY→SERVED. Không quay lùi/nhảy bước. SERVED không hủy; hủy sau PREPARING/READY bắt buộc lý do và manager/admin.')
add('PATCH','/api/v1/order-items/{id}','Giảm số lượng/sửa ghi chú trước nấu','CUSTOMER đúng lượt / nhân viên có quyền sửa đơn',{**V,'quantity':1,'note':'Không hành, ít dầu'},{'id':'<itemId>','status':'PLACED','quantity':1,'note':'Không hành, ít dầu','version':2,'orderVersion':4},'P1.4','Chỉ PLACED/ACCEPTED; quantity không tăng. Tăng hoặc đổi món phải gửi batch mới cần duyệt. note=null xóa ghi chú.')
add('POST','/api/v1/orders/{id}/cancel','Hủy đơn chưa từng bắt đầu nấu','WAITER / MANAGER / ADMIN; CASHIER cho takeaway',{**V,'reason':'Khách đổi lịch nhận, chưa chế biến.'},{'id':'<orderId>','status':'CANCELLED','version':3},'P1.4','Kiểm cả audit lịch sử PREPARING. Nếu đã nấu và hủy ngoại lệ hết món thì thanh toán ZERO thay hủy toàn đơn. Đơn rỗng tại bàn được hủy và đóng lượt.')
add('GET','/api/v1/serving/items','Danh sách món READY','WAITER / MANAGER / ADMIN; CASHIER chỉ takeaway',None,{**QUEUE,'items':[{**QUEUE['items'][0],'status':'READY'}]},'P1.6')
add('GET','/api/v1/checkout/orders','Đơn đang chờ thu tiền','CASHIER / MANAGER / ADMIN',None,{'items':[{'id':'<orderId>','code':'DH-4C8AA1B2C3D4','status':'AWAITING_PAYMENT','totalVnd':190000,'version':8,'tableCode':'B01','orderType':'DINE_IN','pickupCode':None,'pickupName':None,'createdAt':'2026-11-02T15:00:00Z'}]},'P1.7')
add('POST','/api/v1/orders/{id}/request-payment','Xin thanh toán và chốt tiền','CUSTOMER đúng lượt / WAITER / CASHIER / MANAGER / ADMIN',V,{'id':'<orderId>','status':'AWAITING_PAYMENT','totalVnd':190000,'version':8},'P1.7','Mọi dòng phải SERVED/CANCELLED/REJECTED và không batch PENDING. Đơn chưa gửi món phải hủy lượt trống. Không gửi totalVnd từ client.')
add('POST','/api/v1/orders/{id}/reopen','Mở lại đơn chờ trả','CASHIER / MANAGER / ADMIN',{**V,'reason':'Khách muốn gọi thêm món trước khi trả tiền.'},{'id':'<orderId>','status':'SERVING','version':9},'P1.7','Chỉ AWAITING_PAYMENT chưa có payment, không mở lại PAID. Xóa tổng đã chốt; lần gọi thêm vẫn phải duyệt.')
add('POST','/api/v1/orders/{id}/payments','Xác nhận thực nhận tiền','CASHIER / MANAGER / ADMIN',{**V,'method':'CASH','amountVnd':190000,'tenderedVnd':200000,'transferReference':None},{'id':'<paymentId>','receiptNo':'BN-C1D2E3F4A5B678','method':'CASH','amountVnd':190000,'paidAt':'2026-11-02T15:30:00Z','changeVnd':10000,'orderStatus':'PAID','orderVersion':9},'P1.7','amountVnd bằng tổng chốt. BANK_TRANSFER: tenderedVnd=null, transferReference="VCB-20261102-153022-001"; ZERO: amountVnd=0, tenderedVnd=null, transferReference=null. Không thu hai lần/order. Chốt payment/order/visit/revoke khách cùng transaction.')
add('GET','/api/v1/orders/{id}/receipt','Biên nhận nội bộ','WAITER / CASHIER / MANAGER / ADMIN',None,{'id':'<paymentId>','receiptNo':'BN-C1D2E3F4A5B678','method':'CASH','amountVnd':190000,'tenderedVnd':200000,'transferReference':None,'paidAt':'2026-11-02T15:30:00Z','changeVnd':10000,'order':{**ORDER,'status':'PAID','totalVnd':190000}},'P1.7','Không phải hóa đơn điện tử pháp lý. Khách cũ đã bị thu hồi session khi đóng lượt nên không đọc receipt bằng cookie guest cũ.')
RECEIVER={'staffId':'10000000-0000-0000-0000-000000000003','username':'cashier','displayName':'Nhân viên thu ngân','snapshotAvailable':True}
PAID_ORDER=json.loads(json.dumps(ORDER));PAID_ORDER.update(status='PAID',totalVnd=190000,version=9)
for batch in PAID_ORDER['batches']:
    for item in batch['items']:item['status']='SERVED'
PAYMENT_DETAIL={'id':'<paymentId>','orderId':'<orderId>','receiptNo':'BN-C1D2E3F4A5B678','method':'CASH','amountVnd':190000,'tenderedVnd':200000,'transferReference':None,'paidAt':'2026-11-03T04:15:20Z','changeVnd':10000,'receivedBy':RECEIVER,'order':PAID_ORDER}
HISTORY_ROW={'paymentId':'<paymentId>','orderId':'<orderId>','orderCode':'DH-4C8AA1B2C3D4','orderType':'DINE_IN','tableCode':'B01','pickupCode':None,'pickupName':None,'createdAt':'2026-11-03T03:15:00Z','receiptNo':'BN-C1D2E3F4A5B678','method':'CASH','amountVnd':190000,'tenderedVnd':200000,'changeVnd':10000,'transferReference':None,'paidAt':'2026-11-03T04:15:20Z','receivedBy':RECEIVER}
add('GET','/api/v1/admin/payments','Admin tra cứu toàn bộ lịch sử thanh toán','ADMIN',None,{'items':[HISTORY_ROW],'page':1,'pageSize':20,'totalCount':1,'totalPages':1},'P1.7','Query tùy chọn: search (mã đơn/biên nhận/bàn/mã nhận/tên người nhận), fromDate=2026-11-03, toDate=2026-11-03, method=CASH|BANK_TRANSFER|ZERO, orderType=DINE_IN|TAKEAWAY, receivedByStaffId=<UUID>, page=1, pageSize=20 (tối đa100). Ngày theo UTC+07:00, fromDate bắt đầu ngày và toDate hết ngày. Không giới hạn200 đơn: phân trang tới hết lịch sử. Sort paidAt DESC,id DESC. Chỉ gồm PAID, gồm cả tổng0. Không role khác truy cập được. Tên người nhận là snapshot lúc thu; dữ liệu dev trước migration004 không backfill: username/displayName=null, snapshotAvailable=false.')
add('GET','/api/v1/admin/payments/{id}','Admin xem đầy đủ đơn và người nhận thanh toán','ADMIN',None,PAYMENT_DETAIL,'P1.7','id là paymentId, không phải orderId. Trả thời điểm UTC, ID/username/họ tên người nhận tại thời điểm ghi nhận, tiền nhận/trả lại/reference và toàn bộ đợt/dòng món, kể cả hủy/từ chối/rút. Dữ liệu chỉ đọc, không thay đổi khi tên nhân viên hoặc menu đổi. 404 nếu payment không tồn tại. Không xóa/khôi phục dữ liệu dev cũ.')
title,role,body,response,feature,notes=SPEC[('GET','/api/v1/orders/{id}/receipt')]
SPEC[('GET','/api/v1/orders/{id}/receipt')]=(title,role,body,PAYMENT_DETAIL,feature,notes+' receivedBy bổ sung thông tin người nhận được lưu khi thu tiền; bản cũ snapshotAvailable=false.')
title,role,body,response,feature,notes=SPEC[('POST','/api/v1/orders/{id}/payments')]
SPEC[('POST','/api/v1/orders/{id}/payments')]=(title,role,body,{**response,'receivedBy':RECEIVER},feature,notes+' Server tự chụp snapshot người đang xác nhận và thời gian UTC; client không gửi receivedBy/paidAt để quyết định các giá trị này.')
add('GET','/api/v1/requests/{key}','Tra kết quả theo Idempotency-Key','Cùng principal đã gửi',None,{'status':'COMPLETED','response':{'orderId':'<orderId>','batchId':'<batchId>','status':'APPROVED','version':1}},'P1.4','404 chưa chắc request cũ không còn chạy: chỉ retry cùng key/payload. Replay window 24h; sau đó 410 và không tạo lại nghiệp vụ.')
add('GET','/api/v1/openapi.json','Hợp đồng OpenAPI','Công khai',None,{'openapi':'3.0.3','info':{'title':'Restaurant Ordering API','version':'1.0.0'},'paths':{}},None,'File sinh từ catalog test và được đối chiếu route thực. Không chứa secret runtime.')

routes=[(method.upper(),re.sub(r':guid','',path)) for method,path in re.findall(r'app.Map(Get|Post|Put|Patch|Delete)\("([^\"]+)"',(ROOT/'Backend/Restaurant.Api/Program.cs').read_text(encoding='utf-8'))]
assert set(routes)==set(SPEC),f'Route/catalog mismatch: undocumented={set(routes)-set(SPEC)}, stale={set(SPEC)-set(routes)}'
ssot_files={p.name.split('-')[0]:p.name for p in (ROOT/'SSOT').glob('P1.*.md')}
collection={'info':{'name':'Bếp Nhà — Restaurant Ordering','schema':'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},'variable':[{'key':k,'value':v} for k,v in {'baseUrl':'http://localhost:3000','actor':'staff','orderId':'','paymentId':'','batchId':'','itemId':'','visitId':'','tableId':'40000000-0000-0000-0000-000000000001','menuItemId':ROW['menuItemId'],'categoryId':MENU['categoryId'],'staffId':'10000000-0000-0000-0000-000000000001','qrToken':'','version':'1','orderVersion':'1','retryKey':''}.items()], 'item':[]}
pre="""if (pm.request.method !== 'GET') {
 const actor = pm.collectionVariables.get('actor') || 'staff';
 pm.sendRequest({url:pm.collectionVariables.get('baseUrl')+'/api/v1/auth/csrf',method:'GET',header:{'X-Actor':actor}},(err,res)=>{
  if(err || res.code!==200) throw new Error('Cannot get CSRF token');
  pm.request.headers.upsert({key:'X-CSRF-TOKEN',value:res.json().token});
 });
 pm.request.headers.upsert({key:'Idempotency-Key',value:pm.collectionVariables.get('retryKey') || pm.variables.replaceIn('{{$guid}}')});
} """
post="""pm.test('Success or documented business error',()=>pm.expect([200,401,403,404,409,410,422,429]).to.include(pm.response.code));
if(pm.response.code===200){
 const d=pm.response.json();
 ['orderId','batchId','visitId','qrToken'].forEach(k=>{if(d[k])pm.collectionVariables.set(k,d[k]);});
 if(d.id && d.receiptNo)pm.collectionVariables.set('paymentId',d.id);
 if(d.orderVersion)pm.collectionVariables.set('orderVersion',String(d.orderVersion));
 if(d.version)pm.collectionVariables.set('version',String(d.version));
 if(d.batches){pm.collectionVariables.set('orderId',d.id);pm.collectionVariables.set('orderVersion',String(d.version));const b=d.batches.at(-1);if(b){pm.collectionVariables.set('batchId',b.id);if(b.items[0]){pm.collectionVariables.set('itemId',b.items[0].id);pm.collectionVariables.set('version',String(b.items[0].version));}}}
} """
collection['event']=[{'listen':'prerequest','script':{'type':'text/javascript','exec':pre.splitlines()}},{'listen':'test','script':{'type':'text/javascript','exec':post.splitlines()}}]
def path_variable(path):
    if '/admin/payments/' in path:return 'paymentId'
    if '/order-items/' in path:return 'itemId'
    if '/menu-items/' in path:return 'menuItemId'
    if '/menu-categories/' in path:return 'categoryId'
    if '/batches/' in path:return 'batchId'
    if '/visits/' in path:return 'visitId'
    if '/tables/' in path:return 'tableId'
    if '/staff/' in path:return 'staffId'
    return 'orderId'
generated_names=set()
index=['# Danh mục API thực thi','',f'**{len(routes)} endpoint** · Base URL: `http://localhost:3000` · [Hướng dẫn Postman](POSTMAN.md).','', '| Method | API | Tài liệu |','|---|---|---|']
openapi={'openapi':'3.0.3','info':{'title':'Restaurant Ordering API','version':'1.0.0'},'servers':[{'url':'http://localhost:3000'}],'paths':{}}
for n,(method,path) in enumerate(routes,1):
    title,role,body,response,ssot,notes=SPEC[(method,path)]
    slug=f'{n:02d}-{method.lower()}-'+re.sub(r'[^a-z0-9]+','-',path.lower()).strip('-')
    filename=slug+'.md'
    generated_names.add(filename)
    example_path=path.replace('{id}','{{'+path_variable(path)+'}}').replace('{token}','{{qrToken}}').replace('{key}','{{requestKey}}')
    source=f'[SSOT {ssot}](../../SSOT/{ssot_files[ssot]})' if ssot else '[Quy ước API](../../ADR/0005-api-va-nhat-quan.md)'
    payload='Không có request body.' if body is None else '```json\n'+json.dumps(body,ensure_ascii=False,indent=2)+'\n```'
    headers='`Content-Type: application/json`\n'
    if method!='GET':headers+='\n- `X-CSRF-TOKEN: <token lấy từ GET /api/v1/auth/csrf>`\n- `Idempotency-Key: <UUID mới cho một ý định; retry giữ nguyên>`\n'
    headers+='\n- Cookie jar giữ phiên đăng nhập/tham gia. Với request khách, thêm `X-Actor: guest`.\n'
    markdown=f'''# {method} {path}

{title}. **Quyền:** {role}.

Hợp đồng test của endpoint đã implement; nghiệp vụ do {source} sở hữu. Các chuỗi `<...>` trong response là giá trị minh họa cần thay bằng dữ liệu server thật.

## URL và headers

`{method} {{{{baseUrl}}}}{example_path}`

{headers}
## Payload đầy đủ cho kịch bản mẫu

{payload}

## Response thành công — HTTP 200

```json
{json.dumps(response,ensure_ascii=False,indent=2)}
```

{notes}

## Cách thử và lỗi cần kiểm tra

1. Xem [hướng dẫn Postman](POSTMAN.md), đăng nhập đúng role hoặc tham gia lượt.
2. Lấy ID thật từ response tạo/danh sách. Với command, lấy version mới nhất của **đúng thực thể** trước khi gửi; số `1` ở ví dụ không luôn là version hiện tại.
3. Gửi payload mẫu. Thành công trả 200; kiểm tra lại GET tài nguyên để xác nhận dữ liệu.
4. Với lệnh ghi: gửi lại cùng key/payload để kiểm tra chống lặp khi API hỗ trợ idempotency. Không đổi key khi chưa rõ kết quả request trước.

Các lỗi chung: 400 JSON/key sai; 401 hết phiên; 403 sai quyền/CSRF; 404 tài nguyên không thuộc quyền; 409 version/trạng thái/mã trùng/món hết; 410 replay hết hạn; 422 trường sai; 429 quá số lần. Lỗi dùng `{{type,title,status,code,detail,traceId}}`; không có side effect khi transaction thất bại. GET/login/join/logout không lưu idempotency record; command nghiệp vụ mới có replay.
'''
    (OUT/filename).write_text(markdown,encoding='utf-8')
    index.append(f'| {method} | `{path}` | [{title}]({filename}) |')
    pm_body=json.loads(json.dumps(body)) if body is not None else None
    if isinstance(pm_body,dict):
        if 'expectedVersion' in pm_body:pm_body['expectedVersion']='__VERSION__'
        if 'expectedOrderVersion' in pm_body:pm_body['expectedOrderVersion']='__ORDER_VERSION__'
    raw=json.dumps(pm_body,ensure_ascii=False,indent=2).replace('"__VERSION__"','{{version}}').replace('"__ORDER_VERSION__"','{{orderVersion}}') if pm_body is not None else None
    req={'method':method,'header':[{'key':'Content-Type','value':'application/json'},{'key':'X-Actor','value':'{{actor}}'}],'url':'{{baseUrl}}'+example_path,'description':title+' — '+role+'\n'+notes}
    if raw is not None:req['body']={'mode':'raw','raw':raw,'options':{'raw':{'language':'json'}}}
    collection['item'].append({'name':f'{n:02d} {title}','request':req})
    parameters=[{'name':x,'in':'path','required':True,'schema':{'type':'string',**({'format':'uuid'} if x in ['id','key'] else {})}} for x in re.findall(r'{([^}]+)}',path)]
    if path=='/api/v1/admin/payments':
        parameters += [{'name':name,'in':'query','required':False,'schema':schema} for name,schema in [
            ('search',{'type':'string','maxLength':120}),('fromDate',{'type':'string','format':'date'}),('toDate',{'type':'string','format':'date'}),
            ('method',{'type':'string','enum':['CASH','BANK_TRANSFER','ZERO']}),('orderType',{'type':'string','enum':['DINE_IN','TAKEAWAY']}),
            ('receivedByStaffId',{'type':'string','format':'uuid'}),('page',{'type':'integer','minimum':1,'maximum':1000000,'default':1}),('pageSize',{'type':'integer','minimum':1,'maximum':100,'default':20})]]
    operation={'summary':title,'description':role+'; '+notes,'parameters':parameters,'responses':{'200':{'description':'Thành công; example phản ánh shape, ID động cần thay.','content':{'application/json':{'example':response}}},'409':{'description':'Business/version conflict'},'422':{'description':'Validation failed'}}}
    if body is not None:operation['requestBody']={'required':True,'content':{'application/json':{'example':body,'schema':{'type':'object'}}}}
    openapi['paths'].setdefault(path,{})[method.lower()]=operation
for obsolete in OUT.glob('[0-9][0-9]-*.md'):
    if obsolete.name not in generated_names and 'Hợp đồng test của endpoint đã implement' in obsolete.read_text(encoding='utf-8'):
        obsolete.unlink()
(OUT/'README.md').write_text('\n'.join(index)+'\n',encoding='utf-8')
(OUT/'restaurant.postman_collection.json').write_text(json.dumps(collection,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'Backend/Restaurant.Api/openapi.json').write_text(json.dumps(openapi,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Generated {len(routes)} endpoint Markdown files, Postman collection, OpenAPI.')
