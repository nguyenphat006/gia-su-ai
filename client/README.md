# Frontend — Next.js Admin

Giao diện quản trị của template: Next.js App Router + Tailwind CSS v4 + shadcn/ui, dữ liệu qua TanStack Query, kiểu dữ liệu sinh từ OpenAPI của backend. Tổng quan toàn dự án: [`../README.md`](../README.md).

## 1. Công nghệ

| Thành phần | Thư viện | Phiên bản |
|---|---|---|
| Framework | Next.js (App Router, Turbopack, `output: "standalone"`) | 16.3 |
| UI runtime | React | 19.2 |
| Ngôn ngữ | TypeScript (strict) | 5.9 |
| Giao diện | Tailwind CSS · shadcn/ui (Radix UI, style new-york) · lucide-react · sonner (toast) · cmdk | Tailwind 4 |
| Form | react-hook-form | 7 |
| Dữ liệu server | TanStack Query | 5 |
| State client | Zustand | 5 |
| HTTP | Axios | 1.20 |
| Kiểu API | openapi-typescript (sinh từ `server/schema.yml`) | 7.13 |
| Khác | SheetJS (xlsx 0.20 từ CDN chính thức), dnd-kit, docx-preview, recharts, react-day-picker | — |
| Test giao diện | Playwright | 1.63 |

> Next.js 16 có thay đổi API so với các bản trước — đọc `node_modules/next/dist/docs/` trước khi dùng API lạ (xem [`AGENTS.md`](AGENTS.md)).

## 2. Cấu trúc

```text
client/
├── src/
│   ├── app/                     # Route mỏng: chỉ metadata + render View
│   │   ├── (auth)/login/        #   Trang đăng nhập
│   │   ├── (dashboard)/         #   Khu vực đã đăng nhập: layout, loading, error, not-found, các trang
│   │   ├── layout.tsx           #   Root layout: provider, tiêu đề "%s | <tên app>", script chống nháy theme
│   │   ├── not-found.tsx · error.tsx · global-error.tsx
│   │   └── globals.css          #   Biến màu --c-* (sáng / tối) + token shadcn trỏ về chúng
│   ├── modules/<tính-năng>/     # Toàn bộ logic màn hình
│   │   ├── types.ts             #   Kiểu (ưu tiên Schemas[...] sinh từ OpenAPI)
│   │   ├── services/            #   createCrudService + endpoint riêng
│   │   ├── hooks/               #   createCrudHooks (TanStack Query)
│   │   ├── components/          #   FormModal (FormDialog), tab nghiệp vụ riêng của module
│   │   ├── <Feature>View.tsx    #   Màn hình danh sách
│   │   └── index.ts
│   ├── components/
│   │   ├── list/ · detail/      #   Khung trang danh sách (ListPage) và chi tiết (DetailPage)
│   │   ├── ui/                  #   Primitive shadcn (sinh bằng `npx shadcn@latest add`)
│   │   ├── controls/            #   Combobox, TreeSelect, DateRangePicker, NumberInput, FileDropzone
│   │   ├── form/ · feedback/    #   FormDialog + trường react-hook-form · useConfirm, Spinner
│   │   ├── common/              #   StatusBadge, PageHeader, StatusPage, EmptyState, DeleteConfirm,
│   │   │                        #   ExportConfigModal, ExcelImportModal, DetailAttachmentsTab...
│   │   ├── layouts/             #   DashboardLayout (sidebar/drawer mobile, topbar), DynamicBreadcrumb
│   │   └── auth/                #   AuthGuard, Can, ChangePasswordModal
│   ├── lib/api/                 # axiosClient, http<T>, types, errorUtils, formErrors, crud.ts, createCrudHooks.ts
│   ├── lib/utils.ts             # cn (re-export gói `cn` của shadcn)
│   ├── config/app.ts            # Nhận diện dự phòng (thật: Cài đặt → Cấu hình hệ thống)
│   ├── stores/                  # useAuthStore, useThemeStore, useBreadcrumbStore
│   ├── hooks/                   # usePermission, useModuleHeader, useNavigation, useSystemHealth...
│   ├── constants/permissions.ts # Mã quyền (khớp seed_core ở backend)
│   └── types/                   # api.generated.ts (sinh tự động) + api.ts (alias Schemas)
├── scripts/                     # gen-module.mjs + module-template/
├── e2e/                         # Smoke test Playwright
├── playwright.config.ts
└── Dockerfile                   # Image production (standalone)
```

Module mẫu để sao chép: `src/modules/master-data/units` (danh sách) và `src/modules/master-data/materials` (có trang chi tiết).

## 3. Cấu hình & lệnh

`.env.local` (mẫu `.env.example`):

| Biến | Ví dụ | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api/v1` (dev) · `/api/v1` (production sau nginx) | Gốc API — được đóng vào bundle lúc build |

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy dev tại http://localhost:3000 |
| `npm run build` / `npm start` | Build / chạy production |
| `npm run gen:api` | Sinh `src/types/api.generated.ts` từ `../server/schema.yml` |
| `npm run gen:module -- --entity X --label "..." --route nhom/duong-dan` | Sinh module CRUD (types, service, hook, bảng, bộ lọc, form, view, route, quyền) |
| `npm run test:e2e` | Smoke test (`E2E_BASE_URL`, `E2E_USERNAME`, `E2E_PASSWORD`) |
| `npx tsc --noEmit` · `npm run lint -- --max-warnings=0` | Kiểm tra kiểu · ESLint (0 lỗi, 0 cảnh báo — CI chặn) |
| `npx shadcn@latest add <tên>` | Thêm primitive shadcn vào `src/components/ui` |

## 4. Lớp API

```ts
// services: CRUD chuẩn cho mọi ViewSet kế thừa BaseERPViewSet
export const unitService = createCrudService<UnitItem, UnitCreateInput, UnitUpdateInput, UnitFilters>("/units/");

// hooks: tự invalidate cache sau mọi thao tác ghi
export const UNITS_QUERY_KEY = ["units"] as const;
const unitHooks = createCrudHooks(UNITS_QUERY_KEY, unitService);
export const useUnitsList = unitHooks.useList;      // useDetail, useCreate, useUpdate, useDelete, useBatchDelete, useBatchStatus...
```

- `axiosClient` gắn JWT, tự refresh khi 401 và **tự bóc envelope** `{success, message, data}` → service nhận thẳng `data`.
- Endpoint riêng: `http.get/post<T>()`; cần thông điệp server (kết quả hàng loạt): `http.envelope.post<T>()`.
- Lỗi: `extractErrorMessage(err)` (luôn là chuỗi), `applyServerErrors(form, err)` (react-hook-form, `lib/api/formErrors.ts` — FormDialog đã tự gọi), `getErrorCode(err)`, `extractErrorMessageAsync(err)` cho request tải file.
- API danh sách luôn phân trang — cần toàn bộ danh mục nhỏ thì truyền `page_size: 100`.

## 5. Giao diện & quy ước

- **Theme sáng / tối**: component tự viết dùng biến CSS (`var(--c-text)`, `var(--c-surface)`, `var(--c-border)`, `var(--c-primary)`...) thay cho mã hex. Token shadcn (`--primary`, `--border`...) trỏ về các biến này nên không cần cấu hình riêng. Người dùng đổi tại menu avatar → "Giao diện".
- **Đổi thương hiệu**: tên / logo / định dạng mặc định sửa ở Cài đặt → Cấu hình hệ thống (`useSystemSettings`); màu ở `globals.css` (biến `--c-*`).
- **Trang danh sách**: `ListPage` (`@/components/list`) — module chỉ khai báo `columns` (`defineColumns`: sắp xếp, lọc theo kiểu cột, ghim, ẩn), `rowActions`, `bulkActions`. Tìm kiếm / lọc / trang / sắp xếp lưu trên URL (`useListState`); menu cột thống nhất, ⚙ tùy chỉnh bảng, co giãn cột. Xuất Excel: `useExcelExport`.
- **Trang chi tiết** `/[module]/[id]`: `DetailPage` (`@/components/detail`) — khai báo `hero` (tiêu đề, badge, trường), `onEdit`, `moreActions`, `tabs`; tab "Tệp đính kèm" / "Nhật ký", breadcrumb, 404 do khung lo. Badge trạng thái: `StatusBadge` + `defineStatusMap` (6 tông).
- **Phân quyền UI**: `usePermission().can(PERMISSIONS.X.CREATE)` hoặc `<Can>`; menu và breadcrumb lấy từ cây `ModuleRegistry` ở backend. `RouteGuard` trả trang 403 khi mở URL ngoài menu được cấp. View quyết định quyền và chỉ truyền handler (`onEdit`, `onDelete`, xuất/nhập...) khi có quyền; component con chỉ vẽ nút khi có handler.
- **Form**: `FormDialog` + các trường `@/components/form` (react-hook-form); thông báo `toast` (sonner); xác nhận `useConfirm()`; biểu tượng lucide-react.

Quy chuẩn đầy đủ: [`../.claude/rules/`](../.claude/rules) (các file `frontend-*.md`).

## 6. Production

`Dockerfile` build nhiều tầng → `node server.js` (standalone, user không phải root). Build với `--build-arg NEXT_PUBLIC_API_URL=/api/v1` khi chạy sau nginx cùng domain. Toàn bộ stack: [`../docker-compose.prod.yml`](../docker-compose.prod.yml).

> CI và Docker dùng `npm install` thay cho `npm ci`: lockfile sinh bằng npm 11 trên Windows hay thiếu optional deps của Linux.
