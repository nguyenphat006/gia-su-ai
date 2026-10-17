# Kế hoạch migrate: gia-su-ai-khtn → gia-su-ai (Django + Next.js template)

> Trạng thái: **BẢN NHÁP — chờ duyệt DBML**. Chưa có dòng code nào được viết.

**Quyết định đã chốt (17/10/2026):**
- Đấu trường realtime: **Django Channels** (ASGI + Redis channel layer).
- RAG: **pgvector + Gemini embedding** (`gemini-embedding-001`, 768 chiều, index HNSW cosine) trên Neon.
- Dữ liệu cũ: **import vào DB mới** bằng lệnh `import_legacy`; học sinh giữ mật khẩu cũ.
- Deploy: **Render (API + worker + Key Value/Redis) + Vercel (Next.js) + Neon**.
> Nguồn: `gia-su-ai-khtn` (Express + Prisma 7 + Socket.IO, React 19 + Vite). Đích: template ERICSS (Django 5.2 + DRF, Next.js 16 + shadcn).

## 1. Nguyên tắc

- Phần **quản trị** (giáo viên / admin) đi theo template 100%: `startmodule` + `gen:module`, `ListPage` / `DetailPage` / `FormDialog`, RBAC động, pghistory, xuất/nhập Excel, i18n vi/en.
- Phần **học sinh** (Chat AI, Ôn tập, Đấu trường, Thành tích) là giao diện đặc thù → build riêng trong route group `(student)`, vẫn dùng token màu `--c-*`, shadcn, TanStack Query, next-intl của template.
- **Sửa lỗi logic** của bản cũ thay vì bê nguyên (xem §7), không thêm tính năng ngoài danh sách.
- **DBML trước, code sau** — §3 là đề xuất DBML, cần duyệt.

## 2. Ánh xạ tính năng

| Bản cũ | Bản mới | Cách làm |
|---|---|---|
| User + Role enum (STUDENT/TEACHER/ADMIN), status, mustChangePassword | `CustomUser` + Roles `ADMIN` / `TEACHER` / `STUDENT` (bỏ MANAGER/STAFF/vai trò ERP) | Thêm cột `MustChangePassword` vào Users |
| Mật khẩu scrypt `salt:hex` | `LegacyScryptPasswordHasher` trong `PASSWORD_HASHERS` | Học sinh đăng nhập bằng mật khẩu cũ, Django tự nâng cấp hash sang PBKDF2 khi đăng nhập |
| AuthSession (refresh token tự viết) | SimpleJWT + blacklist có sẵn | Bỏ bảng |
| Login bằng username / email / mã HS | Mở rộng serializer login của template | |
| Class, StudentProfile, TeacherProfile | app `academics` | startmodule |
| Import Excel học sinh, tạo HS giả bằng AI, seed hoạt động | `ExcelImportModal` của template + action riêng | Seed hoạt động giả: **bỏ** (dữ liệu bịa) — cần xác nhận |
| SystemConfig key/value (prompt AI, guard, model…) | app `ai_settings`, bảng `AiSettings` key/value | Màn admin theo template |
| KnowledgeDocument + SourceDocument (upload PDF/DOCX/TXT → chunk → sinh câu hỏi) | app `knowledge` | Ingest chạy **Celery** thay vì fire-and-forget; set FAILED khi lỗi |
| RAG: chấm điểm từ khóa, nạp toàn bảng vào RAM | pgvector: nhúng từng đoạn khi nạp, tìm top-K theo cosine + lọc khối | Lệnh `reembed_chunks` nhúng lại khi đổi model |
| QuestionBank, FlashcardDeck, MindmapData, QuizHistory | app `revision` | CRUD admin + API học sinh |
| ChatSession / ChatMessage + guard + XP phạt | app `tutor` | Ảnh đính kèm lưu file (Attachment), không lưu base64 trong DB |
| Đấu trường Socket.IO, hàng đợi trong RAM | app `arena` + **Django Channels** (ASGI, Redis channel layer) | Socket xác thực bằng JWT; server chấm điểm |
| ArenaResult (mỗi client tự POST 1 dòng) | `ArenaMatches` + `ArenaParticipants` | Trận PvP lưu thành 1 bản ghi, khỏi ghép theo ±10 giây |
| UserStats, XpLog, Challenge, UserChallenge, cấp bậc | app `gamification` | Reset challenge ngày + weeklyXp bằng **Celery beat** |
| Báo cáo (heatmap, chat logs, BXH tháng, arena logs, chi tiết HS) | app `analytics` + dashboard template | |
| ActivityLog (ghi mọi request) | pghistory (thay đổi dữ liệu) + `LearningEvents` (hành vi học: xem flashcard, mindmap…) | Không log mọi request nữa |
| Swagger `/api-docs` | drf-spectacular có sẵn | |

## 3. Đề xuất DBML (bản đầy đủ: `server/database.dbml` — đã viết, chờ duyệt)

Quy ước template: bảng PascalCase số nhiều, `Id int`, khối audit chuẩn (`Description, IsActive, CreatedById, UpdatedById, CreatedAt, UpdatedAt, DeletedAt`).

**Sửa Module 0:** `Users` thêm `MustChangePassword bool`. Bỏ Module 1–3 (ERP mẫu: master_data, customers, suppliers).

**Module 1 — Học vụ (`academics`)**
- `Classes`: Code (unique), Name, Grade (6–9), AcademicYear — unique (Name, AcademicYear)
- `StudentProfiles`: UserId (unique), StudentCode (unique), Grade, ClassId
- `TeacherProfiles`: UserId (unique), EmployeeCode, Subject

**Module 2 — Cấu hình AI (`ai_settings`)**
- `AiSettings`: Key (unique), Value text, ValueType (TEXT/NUMBER/BOOL/PROMPT)

**Module 3 — Tri thức (`knowledge`)**
- `SourceDocuments`: FileName, AttachmentId, Grade, Topic, Status (PROCESSING/COMPLETED/FAILED), TotalChunks, ParsedChunks, RawText, ErrorMessage
- `KnowledgeChunks`: SourceDocumentId (nullable — chunk nhập tay), Title, Content, Grade (nullable = chung), Topic, Embedding vector(768) (HNSW cosine), EmbeddedAt

**Module 4 — Ôn tập (`revision`)**
- `Questions`: Grade, ClassId, Topic, QuestionType (MULTIPLE_CHOICE/ESSAY), Difficulty (NHAN_BIET/THONG_HIEU/VAN_DUNG), Content, Options jsonb, CorrectAnswer, Explanation, Hint, Status (PENDING/APPROVED/REJECTED), Origin (MANUAL/AI/DOCUMENT), SourceDocumentId
- `FlashcardDecks`: Grade, ClassId, Topic, Title, Cards jsonb `[{front, back}]`
- `Mindmaps`: Grade, ClassId, Topic, Title, Nodes jsonb `[{id, label, parentId}]`
- `QuizAttempts`: UserId, QuizType (CHINH_PHUC/FLASHCARD_QUIZ), Topic, Grade, TotalQuestions, CorrectCount, XpEarned

**Module 5 — Gia sư AI (`tutor`)**
- `ChatSessions`: UserId, Title, LastMessageAt
- `ChatMessages`: SessionId, Role (USER/MODEL/SYSTEM), Content, IsBlocked, BlockReason — ảnh qua `Attachments` (EntityType = ChatMessage)

**Module 6 — Đấu trường (`arena`)**
- `ArenaMatches`: Mode (PVP/AI), Topic, Grade, QuestionType, Questions jsonb (snapshot đề), Status (IN_PROGRESS/FINISHED/ABANDONED), StartedAt, EndedAt, AiAnalysis jsonb
- `ArenaParticipants`: MatchId, UserId (null = AI), Score, CorrectCount, IsWinner, XpEarned, Answers jsonb — unique (MatchId, UserId)

**Module 7 — Thành tích (`gamification`)**
- `UserStats`: UserId (unique), TotalXp, WeeklyXp, Points, CurrentStreak, LongestStreak, LastStudyDate
- `XpLogs`: UserId, Amount, Action (CHAT_AI/COMPLETE_QUIZ/ARENA/DAILY_LOGIN/ADMIN_BONUS/QUEST_COMPLETED/GUARD_PENALTY), SourceType, SourceId
- `Challenges`: Code (unique), Name, Description, XpReward, PointsReward, Goal, Period (DAILY/WEEKLY/ONCE), TriggerAction
- `UserChallenges`: UserId, ChallengeId, PeriodKey (vd `2026-10-17`, `2026-W42`), Progress, CompletedAt — unique (UserId, ChallengeId, PeriodKey) → tự "reset" theo kỳ, không cần job xóa
- `LevelTiers`: MinXp, Title, SortOrder (bỏ bảng cấp bậc viết cứng 3 nơi)

**Module 8 — Phân tích (`analytics`)**
- `LearningEvents`: UserId, EventType (CHAT/QUIZ/FLASHCARD_VIEW/MINDMAP_VIEW/ARENA/LOGIN), SourceType, SourceId, OccurredAt — nguồn cho heatmap & thống kê HS

Bảng bỏ: `AuthSession` (SimpleJWT), `SystemConfig` (→ AiSettings), `ActivityLog` (→ pghistory + LearningEvents), `ArenaResult` (→ ArenaMatches/Participants).

## 4. Backend — kỹ thuật

- Thêm thư viện: `google-genai`, `pgvector`, `channels`, `channels-redis`, `uvicorn[standard]` (ASGI), `pypdf`, `python-docx`. Celery beat dùng schedule tĩnh trong settings (không thêm bảng).
- `apps/ai/` (không phải module CRUD): `GeminiClient` dùng chung — đọc model / nhiệt độ / prompt từ `AiSettings` (cache Redis), retry 429, `safe_json_parse` cho LaTeX. Tập trung toàn bộ prompt (gia sư, guard, sinh quiz / flashcard / mindmap, chấm tự luận, phân tích trận).
- Prod (Render): web service chạy `gunicorn -k uvicorn.workers.UvicornWorker config.asgi` (HTTP + WebSocket chung 1 service), background worker chạy `celery worker -B`, Render Key Value làm Redis (cache + broker + channel layer). Media (ảnh chat, tài liệu) cần lưu trữ bền: Render disk hoặc S3/R2 — chốt ở P9.
- Vercel: Next.js gọi API Render qua `NEXT_PUBLIC_API_URL`, WebSocket nối thẳng `wss://<api>.onrender.com/ws/arena/`. Lưu ý gói free Render ngủ sau 15 phút → lần vào đầu chậm ~1 phút.
- Mọi ViewSet admin: `BaseERPViewSet` + `ModulePermissionChecker`. API học sinh: quyền `STUDY_*` gán cho vai trò STUDENT trong `rbac.py`, dữ liệu lọc theo `request.user`.

## 5. Frontend — cấu trúc

```
src/app/
  (auth)/login                      ← template, sửa redirect theo vai trò
  (dashboard)/...                   ← admin/giáo viên (template)
     academics/classes, academics/students, academics/teachers
     knowledge/chunks, knowledge/documents
     revision/questions, revision/flashcards, revision/mindmaps
     ai-settings
     analytics, analytics/students/[id], analytics/arena
  (student)/learn/...               ← giao diện đặc thù, layout riêng
     learn/chat, learn/chat/[sessionId]
     learn/practice  (quiz / flashcard / mindmap)
     learn/arena
     learn/achievements
src/modules/student/{chat,practice,arena,achievements}
```

- Thư viện thêm cho phần học sinh: `react-markdown`, `remark-math`, `rehype-katex`, `katex`, `canvas-confetti`, `motion` (hạn chế), `socket` dùng WebSocket gốc (Channels).
- Giữ: nhập giọng nói (Web Speech API), xem mindmap dạng cây, lật flashcard, bảng thành tích.
- Bỏ code chết: firebase, gemini phía client, jsPDF, `/api/extract-text`.

## 6. Chuyển dữ liệu

- Lệnh `python manage.py import_legacy --source-url=<Neon cũ>`: đọc schema Prisma cũ, ánh xạ UUID → Id int (bảng map trong bộ nhớ), chạy trong `transaction.atomic`, chạy lại được (bỏ qua bản ghi đã có theo khóa tự nhiên: username, class code…).
- `ArenaResult` cũ → ghép cặp PvP theo quy tắc ±10 giây một lần duy nhất khi import.
- `ActivityLog` cũ (19k dòng) → chỉ chuyển các dòng sinh ra `LearningEvents`; phần còn lại không chuyển.
- DB đích: database mới trên Neon (khuyến nghị tạo database `giasu_ai` trong cùng project, giữ `neondb` làm nguồn).

## 7. Lỗi bản cũ sẽ sửa khi port

1. `POST /auth/bootstrap` công khai → bỏ (dùng `seed_core`).
2. Socket đấu trường không xác thực, client tự báo đúng/sai → server giữ đáp án, tự chấm.
3. Challenge ngày không reset, hoàn thành sớm 1 bước, `CHIEN_BINH_DA_TAI` không đạt được.
4. `weeklyXp` không bao giờ reset → Celery beat thứ Hai 00:00.
5. Điểm đối thủ AI bị random khi xem báo cáo → lưu điểm AI thật trong `ArenaParticipants`.
6. `/documents/*`, `/arena/generate-quiz` thiếu phân quyền.
7. Upload tài liệu không bao giờ FAILED; RAG nạp cả bảng vào RAM.
8. Ảnh chat lưu base64 trong DB.

## 8. Giai đoạn (mỗi giai đoạn kết thúc bằng health check + commit)

| # | Nội dung | Kết quả kiểm chứng |
|---|---|---|
| P0 | Khung: đổi thương hiệu, bỏ module ERP mẫu, vai trò ADMIN/TEACHER/STUDENT, hasher scrypt, `MustChangePassword`, DBML đầy đủ | `check`, tsc/lint/build xanh |
| P1 | Backend CRUD admin: academics, ai_settings, knowledge, revision | test API + schema.yml |
| P2 | Frontend admin cho P1 (gen:module) + import Excel HS | build xanh, chạy thử |
| P3 | AI core + Chat gia sư + guard + RAG + ingest tài liệu (Celery) | test có mock Gemini |
| P4 | Ôn tập phía học sinh + gamification (XP, streak, challenge, cấp bậc, BXH) | |
| P5 | Đấu trường: Channels, matchmaking, thách đấu, PvE, chấm điểm server | test consumer |
| P6 | Giao diện học sinh `(student)` | chạy thử trên 375px + desktop |
| P7 | Báo cáo / dashboard giáo viên, chi tiết học sinh | |
| P8 | `import_legacy` + chạy trên Neon, đối chiếu số dòng | bảng đối chiếu |
| P9 | Deploy | smoke test e2e |
