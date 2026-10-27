# Quy tắc giải thích code backend để học Express

## Mục đích

Mục tiêu chính của người dùng là học backend Express thông qua dự án Chat.
Code cần chạy đúng và có comment đủ chi tiết để người dùng hiểu từng dòng,
hiểu luồng xử lý và tự viết lại được.

## Phạm vi áp dụng

- Code được viết mới hoặc chỉnh sửa trong `backend/`: routes, controllers,
  middleware, models, services, utils, cấu hình server, kết nối cơ sở dữ liệu,
  xác thực, Socket.IO và các bài test backend.
- Các đoạn gọi hoặc tích hợp API backend ở frontend: endpoint, Axios, dữ liệu
  gửi lên, dữ liệu trả về, token và xử lý lỗi liên quan đến API.
- Ví dụ code backend được đưa vào tài liệu hoặc câu trả lời cho người dùng.

## Cách viết comment

1. Viết comment bằng tiếng Việt, diễn đạt rõ ràng cho người mới học Express.
2. Đặt comment trước từng dòng lệnh có ý nghĩa hoặc ngay cạnh dòng ngắn.
   Giải thích dòng đó làm gì, dùng dữ liệu nào và vì sao cần xử lý như vậy.
   Dấu ngoặc đóng/mở và dòng trống không cần comment riêng.
3. Giải thích import: thành phần được lấy từ đâu và được dùng để làm gì.
   Giải thích biến, tham số, hàm và giá trị trả về khi chúng xuất hiện.
4. Với Express, giải thích `req`, `res`, `next`; dữ liệu lấy từ `req.body`,
   `req.params`, `req.query`, `req.headers`, `req.user`; thứ tự middleware
   và cách route dẫn đến controller.
5. Với xử lý bất đồng bộ, giải thích `async`, `await`, Promise, `Promise.all`,
   `try/catch`, thời điểm chờ kết quả và cách xử lý khi thao tác thất bại.
6. Với Mongoose/MongoDB, giải thích điều kiện truy vấn, toán tử và từng bước
   trong chuỗi truy vấn như `find`, `select`, `populate`, `sort`, `skip`,
   `limit`, `lean`, `updateOne`, `upsert` hoặc `deleteOne` khi được sử dụng.
7. Với mỗi nhánh kiểm tra, giải thích điều kiện, trường hợp thực tế mà nó xử lý
   và lý do chọn HTTP status tương ứng. Giải thích `return` kết thúc handler
   và `res.json()` gửi dữ liệu về client như thế nào.
8. Với xác thực và quan hệ dữ liệu, giải thích cách xác định người dùng hiện tại,
   quyền thực hiện thao tác, dữ liệu được lưu hoặc xóa và cách tránh tạo trùng.
9. Với test backend, giải thích tình huống kiểm tra, dữ liệu giả, phần được mock,
   hành động đang chạy và ý nghĩa của các assertion chính.
10. Khi chỉnh sửa code có sẵn, thêm comment cho phần thay đổi và những dòng
    liên quan cần thiết để người học theo dõi được toàn bộ luồng xử lý.
    Cập nhật comment cũ nếu logic thay đổi để comment luôn khớp với code.

## Khi báo cáo kết quả

- Nêu rõ đã thay đổi gì và cách kiểm tra.
- Tóm tắt luồng xử lý bằng tiếng Việt, chẳng hạn:
  request → middleware xác thực → kiểm tra dữ liệu/quyền → truy vấn DB → response.
- Dẫn tới file có comment để người dùng đọc và học trực tiếp trong code.

Quy tắc này được áp dụng cho các công việc backend tiếp theo trong dự án,
người dùng không cần nhắc lại mỗi lần.
