# English Vocabulary Trainer (web học từ vựng)

> Dự án dùng plugin `bo-chuan-trang`. Quy trình chung theo plugin; file này chỉ chứa phần riêng của dự án.
> Công nghệ đã duyệt (Cổng 1, 23/11). Mọi lệnh dưới đây đã chạy thử 23/11.

## Tổng quan
- Web giúp học sinh, sinh viên học từ vựng tiếng Anh theo mức CEFR A1–C2 bằng ôn ngắt quãng và tự nhớ. Giao diện VI/EN.
- Trạng thái: đang phát triển, chưa có người dùng thật.
- Yêu cầu: `docs/yeu-cau/20261123-web-hoc-tu-vung.md`

## Công nghệ
- Frontend: React + TypeScript + Vite, Tailwind CSS, react-i18next, PWA (vite-plugin-pwa)
- Lưu dữ liệu: IndexedDB qua Dexie (trên trình duyệt, không có backend ở bản đầu)
- Phát âm: Web Speech API
- Hạ tầng: Cloudflare Pages (đề xuất trong docs/kien-truc.md); header bảo mật ở `public/_headers`

## Lệnh
| Việc | Lệnh |
|---|---|
| Cài đặt | `npm install` |
| Chạy local | `npm run dev` |
| Test | `npm test` (Vitest) |
| Đo độ phủ (`src/domain`, `src/data`, `data-pipeline/lib.ts`, `data-pipeline/wiktionary.ts`, ngưỡng > 80%) | `npm run test:coverage` |
| Lint / format / kiểu | `npm run lint` · `npm run format` · `npm run typecheck` |
| Build | `npm run build` |
| Dựng dữ liệu từ | `npm run data:build -- A1` (tải nguồn vào `data-pipeline/.cache`, ghi `public/words/A1.json` và `data-pipeline/report-A1.md`). Từ WordNet thiếu thì lấy Wiktionary, lưu tạm ở `.cache/wiktionary.json`; bị giới hạn tốc độ (429) thì script tự chờ, lỗi thì chạy lại sẽ tiếp tục. Trên cloud cần `NODE_USE_ENV_PROXY=1`. Sau mỗi lần dựng lại, đọc mục "Words from Wiktionary" trong báo cáo và ghi từ sai vào `data-pipeline/review-wiktionary.ts`. |
| Xem bản build | `npm run build` rồi `npx vite preview` |

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
- CEFR-J Vocabulary Profile 1.5 (ghi nguồn bắt buộc), Octanove Vocabulary Profile C1/C2 1.0 (CC BY-SA 4.0), Open English WordNet 2024 (định nghĩa, ví dụ; CC BY 4.0), Wiktionary tiếng Anh (định nghĩa, ví dụ cho từ WordNet thiếu; CC BY-SA 4.0). File `public/words/*.json` dẫn xuất từ Octanove phải giữ CC BY-SA 4.0.

## Luật cứng riêng
- Chưa có.

## Ngoại lệ so với bộ chuẩn
- Bản đầu không có API/controller nên chuẩn độ phủ áp cho `src/domain` và `src/data`.
