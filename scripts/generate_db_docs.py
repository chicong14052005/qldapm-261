"""Generate/check per-table documentation without connecting to or changing a DB."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from db_doc_catalog import COMMON, TABLES, SSOT

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/db'

def source_hashes():
    paths=list((ROOT/'Backend/Restaurant.Api').rglob('*.cs'))
    paths += list((ROOT/'Backend/Restaurant.Api').rglob('*.sql'))
    paths += list((ROOT/'Backend/Restaurant.Api').glob('*.csproj'))
    return {p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest()
            for p in sorted(paths) if not {'bin','obj'}.intersection(p.relative_to(ROOT).parts)}

def cell(value):return str(value).replace('|','\\|').replace('\n',' ')

def render_table(table, metadata):
    name=table['name']; title,purpose,owners,notes,fields=TABLES[name]
    descriptions={**COMMON,**fields}
    missing=[c['name'] for c in table['columns'] if c['name'] not in descriptions]
    extra=set(fields)-{c['name'] for c in table['columns']}
    if missing or extra:raise ValueError(f'{name}: missing explanations={missing}, stale explanations={sorted(extra)}')
    latest=metadata['migrations'][-1]
    text=[f'# `{name}` — {title}', '', f'Đối chiếu schema: `{latest}` · review 03/11/2026. [Danh mục DB](README.md) · [ADR-0003](../../ADR/0003-database.md).',
          '', '## 1. Vai trò và phạm vi', '',purpose,'']
    if owners:text+=['Quy tắc nghiệp vụ: '+', '.join(f'[{o}](../../SSOT/{SSOT[o]})' for o in owners)+'.','']
    text+=['## 2. Các trường', '',
           'Kiểu, NULL và DEFAULT dưới đây là **định nghĩa tại PostgreSQL**, không phải giá trị mặc định của C#. “Không có” nghĩa là DB không tự cấp giá trị; backend có thể cấp khi tạo entity. PK/UQ/FK/CHECK được ghi đầy đủ ở mục 3.', '',
           '| Trường | Kiểu PostgreSQL | Cho NULL | DEFAULT tại DB | Ý nghĩa và cách sử dụng |',
           '|---|---|---|---|---|']
    for c in table['columns']:
        text.append('| '+ ' | '.join([f'`{c["name"]}`',f'`{c["type"]}`','Có' if c['nullable'] else 'Không',f'`{cell(c["default"])}`' if c['default'] is not None else 'Không có',cell(descriptions[c['name']])])+' |')
    text+=['','## 3. Khóa, quan hệ và ràng buộc tại DB','',
           'Các định nghĩa sau lấy từ PostgreSQL catalog sau khi áp dụng đủ chuỗi migration đã ghi ở đầu file. FK `RESTRICT` ngăn xóa bản ghi đang được tham chiếu; không có cascade xóa nghiệp vụ. CHECK không thay cho phân quyền và validation ở service.','']
    parents=set()
    children=set()
    for other in metadata['tables']:
        for con in other['constraints']:
            matched=re.search(r'REFERENCES (?:public\.)?(\w+)\(',con['definition'])
            if matched:
                if other['name']==name:parents.add(matched.group(1))
                if matched.group(1)==name:children.add(other['name'])
    if parents:text+=['Tham chiếu tới: '+', '.join(f'[{n}]({n}.md)' for n in sorted(parents))+'.','']
    if children:text+=['Được tham chiếu bởi: '+', '.join(f'[{n}]({n}.md)' for n in sorted(children))+'.','']
    for con in table['constraints']:
        text += [f'### `{con["name"]}`','','```sql',con['definition'],'```','']
    text+=['## 4. Index và đường truy vấn','',
           'Danh sách gồm cả index tự sinh bởi PRIMARY KEY/UNIQUE; không tạo thêm bản trùng. Partial index chỉ áp dụng các dòng khớp WHERE.','']
    for idx in table['indexes']:text+=['```sql',idx['definition']+';','```','']
    text+=['## 5. Trigger và quy tắc liên bảng','']
    if table['triggers']:
        for trigger in table['triggers']:
            text+=['```sql',trigger['definition']+';','```','']
        text+=['Phần thân và giải thích từng hàm trigger: [TRIGGERS.md](TRIGGERS.md). Trigger `business_integrity` là deferred constraint trigger, kiểm tại commit; không thể suy chỉ từ một INSERT riêng lẻ.','']
    else:text+=['Không có user-defined trigger trên bảng này. Các FK/CHECK ở trên vẫn được PostgreSQL thực thi.','']
    text+=['## 6. Vòng đời, lưu ý và giới hạn','']+['- '+n for n in notes]+['',
           '## 7. Cập nhật tài liệu','',
           'File được sinh từ catalog metadata và phần giải thích đã review trong `scripts/db_doc_catalog.py`. Khi đổi schema/logic liên quan: thêm migration mới nếu cần, cập nhật catalog giải thích, SSOT và ADR cùng thay đổi; export metadata chỉ đọc rồi sinh lại. Chạy `python scripts/generate_db_docs.py --check` trước commit. Xem [quy trình đồng bộ](README.md#quy-trình-đồng-bộ-bắt-buộc).','']
    return '\n'.join(text)

FUNCTION_NOTES={
'check_version':'Mọi UPDATE của 8 bảng Mutable phải tăng version đúng 1; updated_at không trước created_at. Hàm không tự sửa dữ liệu.',
'reject_mutation':'Chặn UPDATE/DELETE payments và audit_events bằng lỗi 23514; không phải cơ chế chống PostgreSQL superuser.',
'check_item_transition':'Chỉ UPDATE item khi order SERVING; giữ snapshot/quan hệ bất biến, kiểm sửa số lượng/ghi chú và chuyển trạng thái hợp lệ.',
'check_business_integrity':'Kiểm liên kết visit/order, batch có 1–50 dòng, batch/item khớp trạng thái, tổng checkout bằng dòng SERVED và payment tồn tại iff order PAID. Deferred đến commit để transaction tạo nhiều bản ghi hợp lệ có thể hoàn tất.',
'guard_order':'Giữ identity order; chặn UPDATE đơn terminal, kiểm chuyển trạng thái và chặn hủy order đã có audit chế biến/bàn giao.',
'guard_batch':'Chỉ quyết định batch PENDING một lần, giữ identity, kiểm tự duyệt và guest đúng visit. Không tự kiểm toàn bộ role được duyệt; service có Require.',
'guard_table':'Không đổi code/capacity/is_active khi có visit OPEN; QR rotate là use case riêng.',
'guard_visit':'Bản hiện hành từ migration003: INSERT khóa bàn, kiểm active/capacity; UPDATE giữ table_id và chỉ sửa từ OPEN. Không còn join_generation.',
'guard_payment_recipient':'INSERT payment phải có snapshot username/tên khớp staff đang được khóa FOR SHARE. Không kiểm role CASHIER tại trigger; service kiểm role.',
'guard_paid_order_history_delete':'Chặn DELETE mọi batch/item của order PAID, kể cả dòng không tính tiền. Giữ chi tiết cho admin tra cứu.',
}

def render_functions(metadata):
    lines=['# Trigger functions hiện hành','',
           f'Được đọc từ PostgreSQL catalog sau `{metadata["migrations"][-1]}`; không thực thi SQL trong tài liệu này. [Danh mục bảng](README.md).', '',
           'SQL được giữ nguyên để tra cứu điều kiện thực tế. `BEFORE` kiểm ngay trên từng dòng; constraint trigger `DEFERRABLE INITIALLY DEFERRED` kiểm khi transaction commit. Không tuyên bố trigger bao phủ mọi phân quyền hoặc mọi validation API.','']
    for f in metadata['functions']:
        lines += [f'## `{f["name"]}`','',FUNCTION_NOTES[f['name']],'','```sql',f['definition'].replace('\r\n','\n').rstrip(),'```','']
    return '\n'.join(lines)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    metadata=json.loads((OUT/'schema-metadata.json').read_text(encoding='utf-8'))
    names={t['name'] for t in metadata['tables']}
    if names!=set(TABLES):raise ValueError(f'Table catalog differs: {names ^ set(TABLES)}')
    migrations=sorted(re.findall(r'\[Migration\("([^"]+)"\)\]', '\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'Backend/Restaurant.Api/Data').glob('*Migration.cs'))))
    if metadata['migrations']!=migrations:raise ValueError('DB metadata does not include the exact migration chain in source. Export from an already upgraded designated database; this tool never applies migrations.')
    generated={f'{t["name"]}.md':render_table(t,metadata) for t in metadata['tables']}
    generated['TRIGGERS.md']=render_functions(metadata)
    generated['source-manifest.json']=json.dumps({'sources':source_hashes()},ensure_ascii=False,indent=2)+'\n'
    stale=[name for name,content in generated.items() if not (OUT/name).exists() or (OUT/name).read_text(encoding='utf-8')!=content]
    unexpected={p.name for p in OUT.glob('*.md')}-set(generated)-{'README.md'}
    if unexpected:raise ValueError(f'Unexpected table documents requiring review: {unexpected}')
    if args.check:
        if stale:raise SystemExit('FAIL: DB docs/source changed; review semantics, SSOT/ADR, metadata and regenerate: '+', '.join(stale))
        print(f'PASS: {len(names)} tables, {sum(len(t["columns"]) for t in metadata["tables"])} fields, {len(metadata["functions"])} trigger functions and backend source fingerprints match documentation.')
    else:
        for name,content in generated.items():(OUT/name).write_text(content,encoding='utf-8',newline='\n')
        print(f'Generated {len(names)} table documents and trigger reference. Review SSOT/ADR and semantic explanations before commit.')

if __name__=='__main__':main()
