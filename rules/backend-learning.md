# Quy tắc comment backend để học Express

Người dùng xây dựng dự án Chat để học backend Express. Comment cần giúp hiểu
chức năng của hàm và giữ code gọn, dễ đọc.

## Phạm vi

Áp dụng cho code backend, các đoạn tích hợp/gọi API hoặc socket ở frontend,
và ví dụ code backend trong tài liệu hoặc câu trả lời.

## Cách viết comment

- Mỗi function chính có một khối `/** ... */` bằng tiếng Việt đặt ngay trước hàm.
- Viết ngắn gọn, thường 1–3 câu: hàm làm gì, nhận dữ liệu gì hoặc trả kết quả gì
  nếu thông tin đó cần để hiểu chức năng.
- Mô tả các callback nhỏ trong comment của function chính; không cần thêm khối
  comment cho từng callback đơn giản.
- Không comment từng dòng, từng import, biến, câu lệnh hoặc assertion trong test.
- Với module cấu hình không có function, có thể dùng một khối comment tổng quan.
- Khi sửa chức năng, cập nhật khối comment để luôn khớp với code.
- Chỉ giải thích từng dòng khi người dùng yêu cầu cụ thể cho đoạn code đó.

## Khi báo cáo kết quả

Nêu ngắn gọn phần đã thay đổi và cách kiểm tra; dẫn tới file liên quan khi hữu ích.
