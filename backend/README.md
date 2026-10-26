# Chat backend

Chạy `npm install` rồi `npm run dev`. Cấu hình kết nối MongoDB và khóa xác thực trong `.env`.

## Danh sách người dùng

`GET /api/users?page=1&limit=20` — yêu cầu header `Authorization: Bearer <access_token>`.

- `page`: số nguyên dương, mặc định 1.
- `limit`: số nguyên từ 1 đến 100, mặc định 20.
- `search`: tùy chọn, chuỗi tối đa 100 ký tự, trim khoảng trắng. Tìm một phần
  `displayName` hoặc `username` không phân biệt hoa thường, ký tự regex được coi là
  văn bản thường; không tự bỏ dấu. Lọc trước khi phân trang và tính tổng.
  Ví dụ: `GET /api/users?page=1&limit=20&search=linh`.
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

## Phiên đăng nhập mobile

`POST /api/auth/signin` nhận thêm `client: "mobile"` cùng username/password để trả
`{accessToken, refreshToken}` trong JSON. Native app lưu token trong MMKV mã hóa,
khóa mã hóa trong Keychain/Keystore; không dựa vào cookie trên HTTP local.

`POST /api/auth/refresh` và `/api/auth/signout` nhận JSON
`{ "client": "mobile", "refreshToken": "..." }`. Refresh trả `{accessToken}` mới;
signout thu hồi session và trả 204. Access token sống 30 phút, refresh token 14 ngày.
Trình duyệt không gửi `client: "mobile"` tiếp tục dùng cookie HttpOnly/Secure/SameSite=None;
refresh token không xuất hiện trong JSON của browser signin. Không ghi token vào log.

## Kiểm tra

Chạy `npm test`. Test controller và đăng ký route dùng Node test runner cùng mock
query Mongoose; không cần mở server và không đọc/ghi cơ sở dữ liệu thật.
