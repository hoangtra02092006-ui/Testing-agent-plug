# Thiết kế: Web học từ vựng — theo yêu cầu: docs/yeu-cau/20261123-web-hoc-tu-vung.md, kiến trúc: docs/kien-truc.md — Trạng thái: Chờ duyệt (Cổng 2)

## Ràng buộc
- Chỉ frontend, dữ liệu trên trình duyệt (IndexedDB), không đăng nhập. React + TS + Vite (đã duyệt).
- ~9.900 từ A1–C2; điện thoại từ 360px; giao diện VI/EN; offline được.

## So sánh phương án: thuật toán ôn (đánh đổi thật)
| | PA1 — SM-2 | PA2 — FSRS (thư viện `ts-fsrs`, MIT) |
|---|---|---|
| Cách làm | Công thức cố định từ 1987: mỗi thẻ có hệ số dễ, khoảng ôn nhân lên theo hệ số | Mô hình trí nhớ (độ ổn định, độ khó), lên lịch để đạt tỉ lệ nhớ mục tiêu (vd 90%) |
| Hiệu quả học | Đủ dùng; dễ bị kẹt thẻ "khó mãi" | Benchmark mở của dự án FSRS: ít lượt ôn hơn cho cùng mức nhớ; đang là mặc định của Anki |
| Tối giản | ~40 dòng tự viết, không phụ thuộc | Thêm 1 thư viện, tham số khó giải thích |
| Đổi sau | Đổi sang FSRS cần chuyển dữ liệu thẻ | Ít lý do phải đổi |
**Đề xuất PA2.** Tiêu chí số 1 của chị là thực dụng: mục tiêu khách là nhớ lâu với ít thời gian, và FSRS phục vụ đúng mục tiêu đó. Phần tối giản vẫn giữ được: domain chỉ gọi interface `Scheduler`, thư viện bị bọc phía sau, đổi được mà không đụng giao diện.

## Tự chấm 5 tiêu chí (toàn thiết kế)
| Tiêu chí | Cách đáp ứng |
|---|---|
| Thực dụng | Đúng 11 AC; không làm tính năng ngoài phạm vi |
| Tối giản | Không backend; 1 thư viện lịch ôn; dữ liệu từ là file JSON tĩnh |
| Dễ dùng | Màn chính có một nút "Ôn ngay"; một tay bấm được trên điện thoại |
| Dễ mở rộng, bảo trì | Domain tách khỏi React và IndexedDB; thêm backend chỉ cần đổi lớp `data` |
| Dễ nhìn | Thẻ một từ một màn, chữ lớn; 4 nút chấm cùng màu nhạt dần |

## Thay đổi
**Màn hình** (`src/features/`):
| Màn | Nội dung |
|---|---|
| Trang chính | Số thẻ đến hạn, số từ mới hôm nay, nút "Ôn ngay", chuỗi ngày |
| Chọn mức | A1–C2, số từ mỗi mức, tiến độ % |
| Phiên ôn | Mặt trước: từ + loại từ + loa. Tự nhớ hoặc gõ nghĩa → "Hiện đáp án" → định nghĩa EN, câu ví dụ + loa (nghĩa VI: bản sau) → 4 nút **Quên / Khó / Nhớ / Dễ** |
| Kết thúc phiên | Số thẻ, tỉ lệ nhớ đúng, chuỗi ngày |
| Thêm từ | Từ, nghĩa, câu ví dụ (bắt buộc từ + nghĩa) |
| Cài đặt | Ngôn ngữ VI/EN, số từ mới/ngày (mặc định 10), xuất/nhập sao lưu JSON |
| Giới thiệu | Ghi nguồn CEFR-J, Octanove (CC BY-SA 4.0) |
Mọi màn có trạng thái đang tải / rỗng / lỗi. Thiết kế mobile trước.

**Logic** (`src/domain/`, không React, không Dexie):
- `Scheduler` (interface) ← `FsrsScheduler`: nhận thẻ + điểm chấm + thời điểm → thẻ mới.
- `buildSession(now, cards, settings)`: thẻ đến hạn trước (hạn sớm nhất trước), rồi từ mới đến khi đủ hạn mức/ngày; thẻ "Quên" quay lại cuối phiên.
- `computeStats(logs, now)`: tỉ lệ nhớ đúng, chuỗi ngày (theo múi giờ máy người học).

**Dữ liệu**:
- `public/words/<level>.json`: `{ id, headword, pos, level, ipa?, meaningVi?, definitionEn, examples[] }` (`meaningVi` để trống ở bản đầu). Tải theo mức khi cần.
- IndexedDB (Dexie): `cards` (wordId, state, due, stability, difficulty, reps, lapses, lastReview) · `reviewLogs` (wordId, rating, reviewedAt) · `customWords` · `settings`. Có số phiên bản schema để nâng cấp sau.
- Sao lưu: xuất toàn bộ IndexedDB ra một file JSON có `schemaVersion`; nhập thì kiểm schema trước khi ghi đè.

**Script dữ liệu** (`data-pipeline/`, chạy một lần trên máy dev):
1. Đọc 2 file CSV, chuẩn hoá từ (tách biến thể kiểu `a.m./A.M.`), bỏ trùng.
2. Ghép định nghĩa + câu ví dụ tiếng Anh từ từ điển mở (WordNet; thiếu thì Wiktionary).
3. Kiểm tự động theo AC11, xuất danh sách từ thiếu định nghĩa hoặc ví dụ.
4. (Bản sau) bước soạn nghĩa tiếng Việt bằng AI cắm thêm vào đây.

**Cấu hình**: không có biến môi trường, không cần API key ở bản đầu.

**Ảnh hưởng tới kiến trúc, deploy, mở rộng**: không đổi so với `docs/kien-truc.md`.

## Kế hoạch test (AC → test)
| AC | Unit test (Vitest) | Kiểm tay sau unit test |
|---|---|---|
| AC1 | `buildSession` đếm đúng thẻ đến hạn | Trang chính hiện số |
| AC2 | — | Đáp án ẩn đến khi bấm |
| AC3 | `FsrsScheduler`: Quên → hạn trong phiên; Dễ → hạn dài hơn Nhớ | — |
| AC4 | — | Nghe phát âm trên Chrome Android, Safari iOS |
| AC5 | `buildSession` giới hạn từ mới theo cài đặt và mức | — |
| AC6 | repository thêm từ tự nhập vào hàng ôn | Form thêm từ |
| AC7 | `computeStats`: tỉ lệ, chuỗi ngày qua nửa đêm | — |
| AC8 | — | Mọi màn ở 360px và 1280px |
| AC9 | i18n: mọi khoá có ở cả `vi.json` và `en.json` | Đổi ngôn ngữ |
| AC10 | xuất → nhập ra lại đúng dữ liệu; từ chối file sai schema | Đóng mở trình duyệt |
| AC11 | script kiểm dữ liệu bắt được từ thiếu định nghĩa/ví dụ | Xem báo cáo từ thiếu |
Độ phủ `src/domain` + `src/data` > 80%.

## Triển khai và phương án lùi
- Thứ tự làm: (1) khung dự án + CLAUDE.md chạy thử lệnh → (2) domain + test → (3) script dữ liệu, mức A1 trước → (4) màn hình → (5) các mức còn lại.
- Lùi: web tĩnh, deploy lại bản build trước. Đổi schema IndexedDB luôn có hàm nâng cấp; không xoá dữ liệu cũ của người học.

## Rủi ro còn lại
- Giọng đọc của trình duyệt khác nhau giữa các máy, một số máy Android không có giọng tiếng Anh. Khi đó hiện nút loa mờ kèm lời giải thích.
- Chưa có nghĩa tiếng Việt: người học trình độ A1–A2 có thể khó hiểu định nghĩa tiếng Anh. Nên ưu tiên thêm nghĩa VI cho A1–A2 ở bản sau.
- Dữ liệu chỉ nằm trên trình duyệt: xoá dữ liệu trình duyệt là mất tiến độ. Có nhắc sao lưu mỗi 7 ngày.
