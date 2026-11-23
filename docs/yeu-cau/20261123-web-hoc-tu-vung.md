# Yêu cầu: Web học từ vựng tiếng Anh — Cỡ: Lớn (dự án mới) — Trạng thái: Đã duyệt (Cổng 1, Trang, 23/11)

## Người học (đã trả lời)
Học sinh, sinh viên: học hằng ngày, bổ sung từ giao tiếp, hoặc ôn IELTS. Từ chia theo 6 mức CEFR **A1–C2**. Giao diện chọn được **Tiếng Việt / English**. Bản đầu **không đăng nhập**, chỉ có phát âm, chưa có hình.

## Mục tiêu
Người học nhớ được từ mới **lâu dài** và **dùng được** trong câu, với 10–15 phút mỗi ngày. Đo bằng: tỉ lệ nhớ đúng khi ôn lại sau ≥ 7 ngày.

## Hiện trạng
Repo `Testing-agent-plug` trống (chỉ README). Chưa có CLAUDE.md, chưa chọn công nghệ.

## Phương pháp đã thu thập (đề xuất chọn)
| # | Phương pháp | Bằng chứng | Đưa vào bản đầu? |
|---|---|---|---|
| 1 | **Ôn ngắt quãng** (spaced repetition): từ sắp quên mới hiện lại | Mạnh: hiệu ứng ngắt quãng, tổng hợp của Cepeda và cs. (2006) | **Có** — lõi |
| 2 | **Gợi nhớ chủ động**: tự nhớ nghĩa trước khi lật; gõ đáp án thay vì chỉ chọn | Mạnh: Karpicke & Roediger (2008), tự kiểm tra hơn đọc lại | **Có** — lõi |
| 3 | **Học trong ngữ cảnh**: mỗi từ có câu ví dụ, cụm hay đi kèm | Mạnh: Nation, học từ qua ngữ cảnh và collocation | **Có** |
| 4 | **Mã hoá kép**: phát âm + hình ảnh | Trung bình–mạnh: Paivio (dual coding) | **Có** phát âm. Hình: để bản sau |
| 5 | **Học theo mức độ**: học hết mức thấp trước, từ thông dụng trước | Mạnh: Nation, nhóm từ thông dụng phủ phần lớn văn bản | **Có** — theo mức A1–C2 |
| 6 | **Tự đặt câu** với từ vừa học | Trung bình: hiệu ứng tự tạo (generation effect) | **Có**, tuỳ chọn |
| 7 | **Thói quen**: mục tiêu ngày, chuỗi ngày học | Trung bình, chủ yếu giữ động lực | **Có**, tối giản (không bảng xếp hạng, không huy hiệu) |
| 8 | Mẹo nhớ từ khoá (keyword mnemonic) | Tốt cho người mới, tốn công soạn | Không — để sau |
| ✗ | Đọc lại danh sách, lật thẻ không tự chấm | Yếu | Không dùng |

## Tiêu chí chấp nhận (bản đầu)
- AC1: Given người học có từ đến hạn ôn, When mở trang, Then thấy số từ cần ôn hôm nay và nút bắt đầu.
- AC2: Given đang ôn một thẻ, When thẻ hiện từ tiếng Anh, Then nghĩa và câu ví dụ bị ẩn đến khi người học tự trả lời (gõ hoặc bấm "hiện đáp án").
- AC3: Given đã xem đáp án, When chấm "Quên / Khó / Nhớ / Dễ", Then lịch ôn kế tiếp của từ đó được tính lại (quên → hiện lại trong phiên; dễ → giãn dài hơn).
- AC4: Given một thẻ, When bấm biểu tượng loa, Then nghe phát âm từ và câu ví dụ.
- AC5: Given chưa học từ nào, When chọn mức (A1–C2), Then nhận N từ mới/ngày của mức đó (N chỉnh được, mặc định 10).
- AC9: Given đang dùng web, When đổi ngôn ngữ giao diện VI ↔ EN, Then toàn bộ chữ giao diện đổi ngay, lựa chọn được nhớ cho lần sau.
- AC10: Given không có tài khoản, When đóng rồi mở lại trình duyệt, Then tiến độ học còn nguyên; có nút xuất/nhập file sao lưu.
- AC6: Given người học gặp từ lạ ngoài đời, When thêm từ (từ, nghĩa, câu ví dụ), Then từ vào hàng ôn như từ có sẵn.
- AC7: Given học xong phiên, When kết thúc, Then thấy số từ đã ôn, tỉ lệ nhớ đúng, chuỗi ngày học.
- AC8: Mọi màn hình dùng tốt trên điện thoại (từ 360px) và máy tính; có trạng thái đang tải / rỗng / lỗi.

## Ngoài phạm vi (bản đầu)
App di động cài đặt, AI chấm câu, học nhóm/xếp hạng, thanh toán, kỹ năng nghe/nói ngoài phát âm từ.

## Nguồn dữ liệu từ (truy đến thực tế)
| Mức | Nguồn | Số mục | Giấy phép |
|---|---|---|---|
| A1–B2 | CEFR-J Vocabulary Profile 1.5 | 7.799 (A1 1.164 · A2 1.411 · B1 2.446 · B2 2.778) | Dùng miễn phí cả thương mại, bắt buộc ghi nguồn |
| C1–C2 | Octanove Vocabulary Profile 1.0 | 2.136 (C1 1.111 · C2 1.025) | CC BY-SA 4.0 (file dữ liệu dẫn xuất phải cùng giấy phép) |

**Thiếu**: hai bộ chỉ có *từ, từ loại, mức*. Chưa có **nghĩa tiếng Việt, định nghĩa tiếng Anh, câu ví dụ, phiên âm** → câu hỏi chặn Q6.

**Cách bổ sung (cập nhật 23/11, Trang)**: bản đầu chỉ dùng định nghĩa + câu ví dụ tiếng Anh từ từ điển mở (WordNet, Wiktionary). **Chưa soạn nghĩa tiếng Việt** để tiết kiệm chi phí; để bản sau, chỉ cần chạy thêm script, không đổi code.
- AC11: Given file dữ liệu một mức, When chạy kiểm tra dữ liệu, Then mọi từ có định nghĩa EN và ít nhất 1 câu ví dụ chứa đúng từ đó; từ nào từ điển mở không có thì liệt kê ra báo cáo.
- Trang web ghi nguồn CEFR-J và Octanove (CC BY-SA 4.0) ở trang Giới thiệu.

## Câu hỏi chặn
Không còn.

## Rủi ro
- Bản quyền bộ từ: Oxford 3000 có bản quyền; NGSL (giấy phép CC BY-SA) dùng tự do.
- Thuật toán ôn: SM-2 đơn giản, FSRS chính xác hơn nhưng phức tạp hơn. Đây là đánh đổi thật, sẽ so ở bước thiết kế.
