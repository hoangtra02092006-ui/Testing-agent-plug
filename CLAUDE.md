# English Vocabulary Trainer (web học từ vựng)

> Dự án dùng plugin `bo-chuan-trang`. Quy trình chung theo plugin; file này chỉ chứa phần riêng của dự án.
> Công nghệ đã duyệt (Cổng 1, 23/11). Lệnh chưa chạy thử vì repo chưa có code.

## Tổng quan
- Web giúp học sinh, sinh viên học từ vựng tiếng Anh theo mức CEFR A1–C2 bằng ôn ngắt quãng và tự nhớ. Giao diện VI/EN.
- Trạng thái: đang phát triển, chưa có người dùng thật.
- Yêu cầu: `docs/yeu-cau/20261123-web-hoc-tu-vung.md`

## Công nghệ
- Frontend: React + TypeScript + Vite, Tailwind CSS, react-i18next, PWA (vite-plugin-pwa)
- Lưu dữ liệu: IndexedDB qua Dexie (trên trình duyệt, không có backend ở bản đầu)
- Phát âm: Web Speech API
- Hạ tầng: hosting tĩnh (chưa chọn: Cloudflare Pages / Vercel / Netlify)

## Lệnh (dự kiến, chạy thử sau khi dựng khung)
| Việc | Lệnh |
|---|---|
| Cài đặt | `npm install` |
| Chạy local | `npm run dev` |
| Test | `npm test` (Vitest) |
| Đo độ phủ (logic `src/domain`, ngưỡng > 80%) | `npm run test:coverage` |
| Lint / format | `npm run lint` · `npm run format` |
| Build | `npm run build` |
| Dựng dữ liệu từ | `npm run data:build` (script trong `data-pipeline/`) |

## Kiến trúc
- `src/domain/` logic thuần (lịch ôn, phiên học, thống kê), không import React hay Dexie.
- `src/data/` interface repository + bản cài đặt IndexedDB và file JSON từ vựng.
- `src/features/` màn hình theo chức năng. `src/shared/ui/` component dùng chung: lỗi giao diện lặp lại thì sửa ở đây.
- `public/words/<level>.json` dữ liệu từ theo mức, tải khi cần.
- Chi tiết: `docs/kien-truc.md`.

## Nhánh và PR
- Nhánh chính: `main`. Nhánh: `feat/<short-name>`, `fix/<short-name>`.
- Commit: Conventional Commits, tiếng Anh. Style guide: TypeScript ESLint recommended + Prettier.

## Môi trường
- Chỉ local và production. Chưa có staging. Không có secret ở bản đầu.

## Triển khai
- Build tĩnh, Trang bấm deploy production. Lùi: deploy lại bản build trước.

## Dữ liệu và giấy phép
- CEFR-J Vocabulary Profile 1.5 (ghi nguồn bắt buộc), Octanove Vocabulary Profile C1/C2 1.0 (CC BY-SA 4.0). File `public/words/*.json` dẫn xuất từ Octanove phải giữ CC BY-SA 4.0.

## Luật cứng riêng
- Chưa có.

## Ngoại lệ so với bộ chuẩn
- Bản đầu không có API/controller nên chuẩn độ phủ áp cho `src/domain` và `src/data`.
