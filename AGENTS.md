# Hướng dẫn làm việc trong repository

- Không xóa Docker images, prune Docker hoặc xóa dữ liệu/volume. Không thao tác dữ liệu các dự án khác. Quyền dọn dev ở một công việc trước không áp dụng cho công việc mới.
- Không commit `.env` nhưng vẫn có quyền đọc .env; có thể tham khảo `.env.example` khi cần biết tên cấu hình. Không stage `temp-docs/` nếu chủ dự án chưa yêu cầu.
- Hoàn tất feature: stage đúng file, commit cục bộ rõ thay đổi/kiểm chứng; không tự push remote.

## Đồng bộ code và tài liệu là điều kiện hoàn tất

- Mỗi feature/phân hệ chỉ có một SSOT trong `SSOT/`; sửa đúng file khi thay yêu cầu, tăng revision/ghi lý do và ngày. Quyết định thực hiện đặt ở ADR liên quan hoặc ADR mới.
- Schema có phiên bản EF SQL-first. Không sửa migration/schema.sql đã áp dụng; thêm migration tiếp theo. Down hiện chưa hỗ trợ tự động; không tự tạo reset để khắc phục lỗi.
- Khi đổi schema, entity, mapping hoặc service: review `docs/db/`, `ADR/0003-database.md`, `ADR/0004-docker-va-migration.md`, các ADR và SSOT/API/GUIDE liên quan trong cùng commit. Mỗi bảng phải có file Markdown đầy đủ từng trường, NULL/DEFAULT/constraint/index/trigger và giải thích vòng đời.
- Nguồn giải thích bảng là `scripts/db_doc_catalog.py`; metadata cấu trúc là `docs/db/schema-metadata.json`. Chỉ export bằng `scripts/export_db_metadata.py` trên đúng PostgreSQL dự án đang chạy và đã được nâng cấp có chủ đích. Export chỉ đọc catalog; không khởi động migrate/seed chỉ để viết tài liệu.
- Sau review và đồng bộ, chạy `python scripts/generate_db_docs.py` rồi `python scripts/generate_db_docs.py --check`. Không chỉ làm mới fingerprint để bỏ qua sai khác mà chưa đọc ảnh hưởng. Check không thay thế review ngữ nghĩa SSOT/ADR.
- Khi đổi route/payload: cập nhật catalog và chạy `python scripts/generate_api_docs.py`, đồng bộ Postman/OpenAPI và Markdown từng endpoint.
- Kiểm thử phù hợp với thay đổi; không chạy smoke tạo dữ liệu nếu nhiệm vụ chỉ là tài liệu hoặc chỉ đọc. Tham khảo `GUIDE/DATABASE-MIGRATIONS.md`.

<!-- postman-cli:installation:start -->

Postman CLI is installed on this device, and can be used for API Engineering work.

<!-- postman-cli:installation:end -->
