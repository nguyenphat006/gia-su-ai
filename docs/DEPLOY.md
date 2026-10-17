# Deploy: Render (API) + Vercel (web) + Neon (PostgreSQL)

```
Trình duyệt ──https──> Vercel (Next.js, client/)
     │
     ├──https──> Render web "giasu-ai-api" (Django ASGI: REST /api/v1 + WebSocket /ws/arena/)
     │               ├── Celery worker + beat (chạy nền cùng container trên gói free)
     │               ├── Render Key Value (Redis): broker Celery, cache, channel layer
     │               └── Neon PostgreSQL (+ pgvector)
     └──wss───> /ws/arena/?token=<access>
```

## 1. Neon — tạo database mới
Giữ `neondb` (dữ liệu bản cũ) để import; tạo database riêng cho bản mới, ví dụ `giasu_ai`
(Neon Console → Databases → New database). Lấy chuỗi kết nối **direct** (host không có `-pooler`) cho Django
— Django giữ kết nối lâu (`conn_max_age`), không cần pgBouncer. pgvector bật tự động bằng migration.

## 2. Render — API
1. New → Blueprint → chọn repo → Render đọc `render.yaml` (web `giasu-ai-api` + Key Value `giasu-ai-redis`).
2. Điền biến `sync: false`:
   - `DATABASE_URL` = chuỗi Neon direct ở bước 1
   - `ADMIN_PASSWORD` = mật khẩu tài khoản `admin` (chỉ dùng khi tạo lần đầu)
   - `GEMINI_API_KEY`
   - `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` = domain Vercel, vd. `https://gia-su-ai.vercel.app`
3. Deploy. `start.sh` tự chạy `bootstrap` (migrate + seed_core), Celery nền, rồi gunicorn + UvicornWorker.
4. Kiểm tra: `https://<api>.onrender.com/api/v1/health/`, Swagger `/api/schema/swagger-ui/`.

Gói free: dịch vụ ngủ sau 15 phút không truy cập (lần đầu mở lại chậm ~1 phút); ổ đĩa không bền — tệp tải lên
(ảnh chat, tệp tài liệu gốc) mất khi deploy lại. Văn bản tài liệu đã trích, đoạn tri thức, câu hỏi nằm trong CSDL
nên không mất. Cần giữ tệp lâu dài: gắn Render Disk (gói trả phí) hoặc S3 / Cloudflare R2.

## 3. Import dữ liệu bản cũ (chạy 1 lần, từ máy dev)
```bash
cd server
DATABASE_URL="<neon giasu_ai direct>" python manage.py bootstrap
DATABASE_URL="<neon giasu_ai direct>" python manage.py import_legacy \
    --source-url "<neon neondb (bản cũ)>" --dry-run      # xem số dòng
DATABASE_URL="<neon giasu_ai direct>" python manage.py import_legacy --source-url "<neon neondb (bản cũ)>"
DATABASE_URL="<neon giasu_ai direct>" GEMINI_API_KEY=... python manage.py shell -c \
    "from apps.knowledge.tasks import embed_pending_chunks; print(embed_pending_chunks())"
```
Học sinh đăng nhập bằng mật khẩu cũ (tên đăng nhập hoặc mã học sinh).

## 4. Vercel — web
1. New Project → repo → **Root Directory = `client`** (Framework: Next.js).
2. Biến môi trường: `NEXT_PUBLIC_API_URL=https://<api>.onrender.com/api/v1`
   (WebSocket tự suy ra `wss://<api>.onrender.com/ws/arena/`; ghi đè bằng `NEXT_PUBLIC_WS_URL` nếu cần).
3. Deploy, rồi cập nhật `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` trên Render nếu domain đổi.

## 5. Sau deploy
- Đăng nhập `admin`, vào Cấu hình AI kiểm tra model / prompt; Tri thức RAG → tài liệu cũ đã có văn bản,
  đoạn tri thức cần nhúng vector (bước 3).
- Smoke test: `E2E_BASE_URL=https://<web> E2E_PASSWORD=... npm run test:e2e` (trong `client/`).
- Đổi mật khẩu Neon cũ nếu đã từng lộ.
