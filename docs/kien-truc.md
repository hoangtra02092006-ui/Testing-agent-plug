# Kiến trúc: Web học từ vựng — theo yêu cầu: docs/yeu-cau/20261123-web-hoc-tu-vung.md — Trạng thái: Chờ duyệt (Cổng 2)

## Kết luận
Trang tĩnh chỉ có frontend, dữ liệu học lưu trên trình duyệt, hosting tĩnh miễn phí. Phần logic tách khỏi giao diện và nơi lưu dữ liệu, nên thêm backend về sau mà không viết lại lõi. (Công nghệ đã duyệt ở Cổng 1; file này bổ sung deploy, mở rộng, bảo mật.)

## Yêu cầu phi chức năng
| Mục | Giá trị | Nguồn |
|---|---|---|
| Người dùng | vài trăm (năm đầu) → vài chục nghìn | ước lượng |
| Thiết bị | điện thoại là chính, cả máy tính; học được khi mất mạng | yêu cầu |
| Dữ liệu nhạy cảm | không (không tài khoản, không thông tin cá nhân) | yêu cầu |
| Ngân sách hosting | 0 đồng ở bản đầu | ước lượng, cần Trang xác nhận |

## Kiểu kiến trúc và lý do
SPA tĩnh + PWA, không backend. Không có dữ liệu người dùng phải lưu trên máy chủ, bộ từ cố định → kiểu nhỏ nhất đáp ứng đủ. **Nâng lên SPA + API khi**: cần đăng nhập, đồng bộ nhiều máy, hoặc giáo viên theo dõi học sinh.

## Các lớp
- **Frontend**: React SPA, PWA cache toàn bộ app và file từ đã tải để chạy offline.
- **Backend**: chưa có.
- **Dữ liệu**: bộ từ là file JSON tĩnh theo mức (`public/words/<level>.json`, mỗi mức ~100–400 KB, tải khi chọn mức). Tiến độ ở IndexedDB.
- **Xác thực**: không có.
- **Tích hợp ngoài**: Web Speech API của trình duyệt (phát âm).

## Công nghệ
| Lớp | Chọn | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript | Bắt lỗi kiểu sớm |
| UI | React + Vite | Phổ biến, build nhanh |
| CSS | Tailwind CSS | Responsive nhanh, nhất quán |
| Lưu trữ | IndexedDB qua Dexie | Đủ chỗ cho ~10.000 thẻ + lịch sử; localStorage chỉ ~5 MB |
| Lịch ôn | FSRS (`ts-fsrs`) sau interface `Scheduler` | Xem so sánh trong thiết kế |
| i18n | react-i18next | VI/EN |
| Offline | vite-plugin-pwa | Học sinh dùng điện thoại, mạng chập chờn |
| Test | Vitest + Testing Library, độ phủ v8 | Chuẩn > 80% |

## Cấu trúc code
```
src/domain/     logic thuần (Scheduler, buildSession, computeStats), không import React/Dexie
src/data/       interface WordRepository, ProgressRepository + bản IndexedDB/JSON
src/features/   màn hình theo chức năng
src/shared/ui/  component dùng chung — lỗi giao diện lặp lại sửa ở đây
src/i18n/       vi.json, en.json
data-pipeline/  script dựng public/words/*.json từ CSV + từ điển mở
```

## Giao diện
Mobile trước (360px), một thẻ một màn hình, chữ lớn, nút chấm điểm vừa ngón cái. Không dùng UI kit nặng; component tự viết trên Tailwind. Đa ngôn ngữ VI/EN. Truy cập: tương phản đạt WCAG AA, dùng được bằng bàn phím trên máy tính.

## Deploy
| Mục | Nội dung |
|---|---|
| Hosting | Cloudflare Pages (gói miễn phí, băng thông không giới hạn với trang tĩnh). Thay thế: Vercel, Netlify |
| Môi trường | local, production. Mỗi PR có link xem thử tự động của Cloudflare Pages, thay cho staging |
| Build | `npm run build` ra thư mục `dist/` |
| Ai bấm | Trang (merge vào `main` hoặc bấm deploy) |
| Lùi | Chọn lại bản deploy trước trên Cloudflare, một cú bấm |
| Chi phí | 0 đồng/tháng; tên miền riêng (nếu muốn) khoảng 250–300 nghìn đồng/năm |

## Đường mở rộng
- **Thêm đăng nhập**: thêm API (NestJS + PostgreSQL + Prisma), thêm `HttpProgressRepository`; domain và màn hình giữ nguyên. Lần đầu đăng nhập thì đẩy tiến độ đang có trên trình duyệt lên máy chủ.
- **Tăng 10 lần người dùng**: không nghẽn vì là trang tĩnh trên CDN, mọi tính toán chạy trên máy người học. Khi có backend thì điểm nghẽn đầu tiên sẽ là ghi lịch sử ôn; giải bằng gom ghi theo lô.
- **Thêm nghĩa tiếng Việt**: chạy script soạn nghĩa ở `data-pipeline/`, chỉ cập nhật file JSON, không đổi code.

## Bảo mật và sao lưu
Không có dữ liệu cá nhân trên máy chủ. Rủi ro chính là người học mất tiến độ khi xoá dữ liệu trình duyệt: có nút xuất/nhập sao lưu và nhắc sao lưu mỗi 7 ngày. Bật Content-Security-Policy chặt (chỉ tải tài nguyên cùng nguồn).

## Phương án đã cân nhắc và loại
- Next.js full-stack ngay từ đầu: thừa khi chưa đăng nhập, tốn máy chủ.
- localStorage: không đủ dung lượng.
