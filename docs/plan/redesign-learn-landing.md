# Kế hoạch thiết kế lại giao diện: trang chủ công khai `/` và cổng học sinh `/learn`

> Trạng thái: **đề xuất, chờ duyệt**. Chưa sửa code.
> Hướng thiết kế lấy từ skill `ui-ux-pro-max` (`--design-system "education learning platform students gamification K-12"`, cùng các truy vấn `typography`, `google-fonts`, `landing`, `product`, `ux`). Phần nào chỉnh lại so với gợi ý của skill thì có ghi lý do.

## 1. Hiện trạng và vấn đề

| Khu vực | Hiện có | Vấn đề với học sinh và giáo viên |
|---|---|---|
| `/` (`modules/landing`) | Dải xanh phẳng, khung chat mẫu (chỉ hiện ở desktop), 4 thẻ tính năng, khối giáo viên, 3 bước bắt đầu | Trông giống trang quản trị: phẳng, nhiều chữ, không có hình minh họa. Trên mobile mất phần chat mẫu nên học sinh không biết sản phẩm trông ra sao. Giáo viên không có lối vào riêng |
| `/learn` trang chủ (`HomeView`) | Lời chào, `LevelCard`, 4 lối tắt, thử thách, top 5 tuần | Các khối nặng như nhau, chưa có một việc chính mỗi ngày. Lối tắt lặp lại menu dưới. Các phần game hóa (streak, XP) chưa đem lại cảm giác đã tiến bộ |
| Khung `/learn` (`StudentShell`) | Thanh trên, menu dọc trên desktop, thanh dưới trên mobile | Ổn về cấu trúc. Chỉ cần làm cho ấm và dễ thương hơn, không cần đổi bố cục |
| Chữ | Font hệ thống | Không có chất riêng. Tiêu đề tiếng Việt có dấu trông cứng |

## 2. Hướng thiết kế: "Phòng thí nghiệm thân thiện"

Người dùng là học sinh 11–15 tuổi, chủ yếu dùng điện thoại, và giáo viên dùng máy tính ở trường. Mục tiêu: **vui nhưng không trẻ con, rõ ràng nhưng không khô.**

### 2.1 Phong cách
- Skill gợi ý **Claymorphism** (bo tròn đầy, đổ bóng mềm, có cảm giác bấm được), hợp với ứng dụng giáo dục.
- **Chỉnh lại:** dùng *clay nhẹ* và chỉ ở vài điểm nhấn: nút chính, `LevelCard`, thẻ "nhiệm vụ hôm nay", thẻ tính năng ở `/`. Các phần còn lại giữ phẳng theo `.claude/rules/frontend-ux.md` (hiệu ứng nặng chỉ dành cho nút chính và khối thương hiệu, không lồng Card).
- Bo góc: 16px cho thẻ, 12px cho nút, nút chính dạng viên thuốc (`rounded-full`). Bóng hai lớp mềm: `0 1px 0 rgb(255 255 255 / .6) inset, 0 6px 16px -6px rgb(2 132 199 / .35)`.
- Icon: tiếp tục dùng lucide-react, không dùng emoji (đúng rule và checklist của skill).

### 2.2 Màu
- Skill gợi ý tím chàm `#4F46E5`. **Không dùng.** Dự án đã chốt lại màu xanh da trời của bản cũ (commit `1fbf4b8`) và học sinh đã quen.
- Giữ `--c-primary` sky `#0284C7` và thêm một bộ màu phụ theo vai trò. Tất cả là token trong `.theme-learn`, không viết cứng mã màu trong component.

| Token mới | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--c-learn-surface` | `#F0F9FF` | `#0B1220` | Nền trang `/learn` và `/` (xanh rất nhạt thay cho xám) |
| `--c-learn-band` | `#0369A1` | `#0C4A6E` | (đã có) Dải đầu trang |
| `--c-xp` | `#D97706` (Amber) | `#FBBF24` | XP, streak |
| `--c-progress` | `#059669` (Emerald) | `#34D399` | Thanh tiến độ, câu đúng |
| `--c-arena` | `#E11D48` | `#FB7185` | Đấu trường |
| `--c-clay-shadow` | xem 2.1 | bóng tối hơn, bỏ lớp inset | Bóng clay |

Kiểm tra độ tương phản 4.5:1 cho chữ trên mọi nền ở cả chế độ sáng và tối trước khi chốt.

### 2.3 Chữ
- Skill gợi ý Baloo 2 + Comic Neue. **Comic Neue không có bộ chữ tiếng Việt** (đã tra `google-fonts.csv`) nên bị loại.
- Chốt: **Baloo 2** cho tiêu đề (tròn, vui, có tiếng Việt) và **Be Vietnam Pro** cho nội dung (skill xếp hạng 1 cho tiếng Việt). Nạp bằng `next/font/google` với `subsets: ["vietnamese", "latin"]` và gán vào `--font-sans-app` và `--font-display`. Font chỉ áp dụng trong `.theme-learn`; trang quản trị giữ nguyên.
- Cỡ chữ: nội dung 16px trên mobile (dễ đọc cho học sinh), tiêu đề trang 24–28px, tiêu đề hero 36–48px.

### 2.4 Chuyển động
- Dial `--motion 4`: chỉ dùng hiệu ứng nhỏ và có ý nghĩa. Không thêm GSAP mà dùng CSS/Tailwind (`transition`, `@keyframes`), vì dự án chưa có thư viện animation.
- Mỗi màn hình tối đa 1–2 điểm động (theo skill): thanh XP chạy khi tải, thẻ hơi lún xuống khi bấm (`active:translate-y-px`, 150–200ms), confetti khi hoàn thành (đã có `canvas-confetti`).
- Bắt buộc tắt hết các hiệu ứng trên khi người dùng bật `prefers-reduced-motion: reduce`.

## 3. Trang chủ công khai `/`

Mẫu từ skill: **Product Demo + Features**, kết hợp **Storytelling** cho ứng dụng giáo dục. Thứ tự các khối:

1. **Header**: giữ như hiện tại, thêm hai nút "Học sinh vào học" (chính) và "Giáo viên" (phụ, dẫn tới `/login`; giáo viên đăng nhập xong sẽ được chuyển sang `/admin`).
2. **Hero** (dải xanh):
   - Bên trái: dòng nhỏ "KHTN 6–9 · Trường THCS Phước Tân 3", tiêu đề ngắn bằng Baloo 2, một câu phụ, CTA chính dạng viên thuốc màu trắng.
   - Bên phải: **khung chat mẫu hiện trên cả mobile** (đặt dưới chữ, thu gọn còn một câu hỏi và một câu trả lời), có công thức KaTeX thật để thể hiện thế mạnh. Dữ liệu tĩnh, có `aria-hidden`.
   - Trang trí nền: 2–3 hình SVG nét mảnh (nguyên tử, lá cây, bình thí nghiệm) cho ba phân môn Lý, Sinh, Hóa, độ mờ thấp. Vẽ bằng SVG inline, không tải ảnh.
3. **Học sinh làm được gì**: 4 thẻ clay (Gia sư AI · Ôn tập · Đấu trường · Thành tích). Mỗi thẻ có một **ảnh minh họa giao diện thu nhỏ** dựng bằng HTML/CSS tĩnh, ví dụ ô flashcard lật hay hai thanh điểm đối đầu. Đây là "product demo" thay cho video.
4. **Dành cho giáo viên**: 3 điểm (nạp tài liệu → AI soạn câu hỏi → báo cáo lớp) trình bày dạng **dòng thời gian 3 bước**, kèm một ảnh minh họa bảng báo cáo.
5. **Bắt đầu trong 3 bước**: giữ như cũ, chuyển sang đánh số lớn kiểu Baloo.
6. **CTA cuối trang**: một dải ngắn với nút đăng nhập.
7. **Footer**: giữ như cũ.

**Không làm:**
- Không có khối lời chứng thực (testimonials) như skill gợi ý vì chưa có lời thật của học sinh hay giáo viên, và không được bịa. Khi trường cung cấp, có thể thêm sau.
- Không có số liệu kiểu "1.000+ học sinh" khi chưa có API công khai trả số thật.

## 4. Cổng học sinh `/learn`

### 4.1 Trang chủ `/learn`: một việc chính mỗi ngày
Bố cục mobile, từ trên xuống:

```
┌ [icon Sun/Moon theo giờ] Chào buổi sáng, Minh ────────────────┐
│ [LevelCard clay]  Danh hiệu · thanh XP chạy · [Flame] streak · hạng │
├───────────────────────────────────────────────────────────────┤
│ NHIỆM VỤ HÔM NAY  (thẻ nổi bật nhất, 1 nút chính)              │
│  ◯ Điểm danh   ◯ 1 bài ôn tập   ◯ Hỏi gia sư 1 câu  [Bắt đầu]│
├───────────────────────────────────────────────────────────────┤
│ Lối tắt: 2×2 thẻ có màu riêng (sky / emerald / rose / amber)  │
├───────────────────────────────────────────────────────────────┤
│ Top 5 tuần (dòng của mình được tô sáng, có avatar chữ cái)    │
└───────────────────────────────────────────────────────────────┘
```

- **Nhiệm vụ hôm nay** dùng lại dữ liệu `useMyChallenges()` (thử thách `DAILY`), chỉ đổi cách trình bày: vòng tiến độ `ProgressRing` cộng danh sách tick. Nút chính dẫn tới thử thách đầu tiên chưa xong. **Không cần API mới.**
- Bỏ trùng lặp: trên desktop đã có menu dọc, nên ẩn khối lối tắt ở `lg` hoặc thu thành một dòng chip nhỏ. Trên mobile vẫn giữ khối lối tắt.
- `LevelCard`: nền dải xanh, bóng clay, khi tải thì thanh XP chạy từ 0 đến giá trị thật trong 700ms. Khi gần lên cấp (≥ 90%) thì hiện dòng "Còn X XP nữa!" bằng màu `--c-xp`.
- Lời chào thay đổi theo giờ (sáng / chiều / tối). Chữ lấy từ i18n, không gọi thêm API.

### 4.2 Khung chung (`StudentShell`, `StudentNav`)
- Nền đổi sang `--c-learn-surface`, thẻ màu trắng, cho cảm giác sáng và sạch.
- Thanh dưới mobile: mục đang chọn có viên thuốc màu và icon nét đậm; bấm vào có hiệu ứng lún. Giữ 5 mục (skill: tối đa 5).
- `XpChip`: khi XP tăng thì số nhảy nhẹ (scale 1 → 1.15 → 1), tắt khi `reduced-motion`.

### 4.3 Các trang con (giai đoạn sau, chỉ áp dụng token và thành phần mới)
- **Chat**: bong bóng bo 16px, avatar gia sư có màu, ô nhập dạng viên thuốc to (≥ 44px), gợi ý câu hỏi dạng chip.
- **Ôn tập**: thẻ chọn chế độ theo kiểu clay. Đáp án đúng / sai báo bằng màu kèm icon (không chỉ dựa vào màu).
- **Đấu trường**: dùng `--c-arena`, màn hình đếm ngược số lớn bằng Baloo.
- **Thành tích**: huy hiệu cấp bậc dạng huy chương SVG, bảng xếp hạng có podium cho top 3.

## 5. Thành phần dùng chung (đặt trong `modules/student/shared/ui.tsx` và dùng lại cho landing)

| Thành phần | Mô tả |
|---|---|
| `ClayCard` | Thẻ bo 16px, bóng clay, có trạng thái hover / active. Chỉ dùng cho khối điểm nhấn |
| `PillButton` | Biến thể `Button` (`rounded-full`, cao 44–48px) cho CTA chính |
| `MissionItem` | Một dòng nhiệm vụ: vòng tick, tên, `+XP` |
| `SubjectDoodle` | SVG trang trí Lý / Hóa / Sinh, `aria-hidden` |
| `AnimatedProgress` | Bọc `Progress`, chạy từ 0 đến giá trị thật, tôn trọng `reduced-motion` |

## 6. Giai đoạn thực hiện (mỗi giai đoạn kết thúc bằng `/verify` và commit khi bạn yêu cầu)

| # | Nội dung | Phạm vi file | Kiểm chứng |
|---|---|---|---|
| D1 | Token màu, font Baloo 2 + Be Vietnam Pro, bóng clay, `ClayCard`, `PillButton`, `AnimatedProgress` | `globals.css`, `app/layout.tsx`, `student/shared/ui.tsx` | tsc / lint / build; xem sáng và tối |
| D2 | Trang chủ `/` theo mục 3 | `modules/landing/*`, `messages/{vi,en}` | 375px, 768px, 1440px; Lighthouse a11y ≥ 95 |
| D3 | Trang chủ `/learn` và khung chung theo 4.1–4.2 | `student/home`, `student/shell`, `LevelCard` | 375px; Network chỉ có các request đang hiện |
| D4 | Áp dụng cho chat, ôn tập, đấu trường, thành tích theo 4.3 | `student/*` | Vitest hiện có xanh; thử luồng chính |

Toàn bộ chữ mới thêm vào cả `vi` và `en` (`frontend-i18n.md`). Không thay đổi backend hay DBML.

## 7. Checklist trước khi bàn giao (theo skill)
- [ ] Không dùng emoji làm icon; mọi nút chỉ có icon đều có `aria-label`
- [ ] Vùng bấm ≥ 44×44px, khoảng cách giữa các vùng bấm ≥ 8px
- [ ] Độ tương phản ≥ 4.5:1 ở cả chế độ sáng và tối
- [ ] Thấy rõ viền focus khi dùng bàn phím
- [ ] Tắt hiệu ứng khi `prefers-reduced-motion`
- [ ] Không cuộn ngang ở 375px; thanh dưới mobile không che nội dung (`pb-24` và safe-area)
- [ ] Đủ ba trạng thái tải / rỗng / lỗi

## 8. Câu hỏi cần bạn chốt
1. Font: Baloo 2 cho tiêu đề (vui, tròn) hay Be Vietnam Pro cho tất cả (an toàn, nghiêm túc hơn)?
2. Mức clay: chỉ ở điểm nhấn như đề xuất, hay áp dụng rộng hơn?
3. Trường có ảnh thật (logo, ảnh học sinh hoặc lớp học) hay lời nhận xét thật của giáo viên để đưa lên `/` không?
4. Làm lần lượt D1 → D4, hay chỉ D1–D3 trước rồi xem lại?
