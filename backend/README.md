# Chat backend

Chạy `npm install` rồi `npm run dev`. Cấu hình kết nối MongoDB và khóa xác thực trong `.env`.

## Danh sách người dùng

`GET /api/users?page=1&limit=20` — yêu cầu header `Authorization: Bearer <access_token>`.

- `page`: số nguyên dương, mặc định 1.
- `limit`: số nguyên từ 1 đến 100, mặc định 20.
- Loại tài khoản đang đăng nhập khỏi danh sách và tổng số.
- Sắp xếp `_id` giảm dần để thứ tự phân trang ổn định.
- Chỉ trả `_id`, `displayName`, `username`, `avatarUrl`; không trả email, số điện thoại hoặc mật khẩu.

```json
{
  "users": [{"_id": "...", "displayName": "Linh Nguyễn", "username": "linh", "avatarUrl": null}],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 21,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Không có người dùng khác: HTTP 200 với `users: []`, `total: 0`, `totalPages: 0`.
Trang vượt phạm vi trả mảng rỗng; tham số sai trả HTTP 400. Swagger có tại `/api-docs`.

## Kiểm tra

Chạy `npm test`. Test controller và đăng ký route dùng Node test runner cùng mock
query Mongoose; không cần mở server và không đọc/ghi cơ sở dữ liệu thật.
