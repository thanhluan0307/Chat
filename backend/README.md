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
- Trả `_id`, `displayName`, `username`, `avatarUrl` và `friendshipStatus`; không trả email, số điện thoại hoặc mật khẩu.
- `friendshipStatus`: `none` (có thể gửi lời mời), `sent` (đã gửi), `received`
  (đã nhận lời mời), `friends` (đã là bạn bè), tính theo tài khoản đang đăng nhập.
  Quan hệ bạn bè được ưu tiên nếu còn lời mời cũ; tra cứu chỉ những người trong trang hiện tại.

```json
{
  "users": [{"_id": "...", "displayName": "Linh Nguyễn", "username": "linh", "avatarUrl": null, "friendshipStatus": "none"}],
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

## Gửi lời mời kết bạn

`POST /api/friends/requests` — yêu cầu `Authorization: Bearer <access_token>`
và `Content-Type: application/json`.

```json
{
  "to": "64b000000000000000000002",
  "message": "Chào bạn, kết bạn với mình nhé!"
}
```

- `to`: bắt buộc, MongoDB ObjectId dạng chuỗi 24 ký tự hex.
- `message`: tùy chọn, được trim và giới hạn 300 ký tự; lời nhắn rỗng được bỏ qua.
- Người gửi luôn lấy từ phiên xác thực, không nhận `from` do client gửi.
- HTTP 201 trả `{ "message": "Gửi lời mời kết bạn thành công", "request": {...} }`.
  `request` gồm `_id`, `from`, `to`, lời nhắn nếu có và `createdAt`/`updatedAt`.
- HTTP 400: ID/lời nhắn không hợp lệ hoặc tự gửi cho mình; 404: người nhận không tồn tại.
- HTTP 409: đã là bạn bè hoặc có lời mời đang chờ theo một trong hai chiều.
  Khi đã nhận lời mời từ người kia, dùng API chấp nhận thay vì tạo lời mời ngược lại.
- HTTP 401/403: cần đăng nhập hoặc làm mới access token; 500: lỗi hệ thống.

Chỉ mục unique `pairKey` trên cặp ID đã sắp xếp chặn tạo trùng khi gửi đồng thời,
kể cả hai chiều. Model tự tính khóa khi tạo lời mời. Chỉ mục partial bỏ qua dữ liệu
cũ chưa có khóa; bước kiểm tra hai chiều vẫn nhận diện các lời mời cũ.

## Danh sách lời mời kết bạn

`GET /api/friends/requests` — yêu cầu `Authorization: Bearer <access_token>`.
Trả `{ "sent": [], "received": [] }` khi chưa có lời mời đang chờ.

- `sent`: `from` là ID tài khoản hiện tại; `to` là hồ sơ công khai của người nhận.
- `received`: `to` là ID tài khoản hiện tại; `from` là hồ sơ công khai của người gửi.
- Mỗi lời mời có `_id`, `from`, `to`, `message` nếu có, `createdAt`, `updatedAt`.
- Hồ sơ được populate chỉ gồm `_id`, `username`, `displayName`, `avatarUrl`.
  Nếu người đó đã xóa tài khoản, hồ sơ là `null`.
- Cả hai danh sách sắp xếp `createdAt` giảm dần, rồi `_id` giảm dần để ổn định thứ tự.
- Không trả `pairKey` hoặc thông tin riêng của người dùng. Chỉ lấy lời mời thuộc
  tài khoản đang đăng nhập; lỗi DB trả 500, xác thực theo middleware chung.

## Chấp nhận và từ chối lời mời

- `POST /api/friends/requests/:requestId/accept`: HTTP 200 với
  `{ "message": "...", "newFriend": { "_id": "...", "username": "...", "displayName": "...", "avatarUrl": "..." } }`.
  Tạo một quan hệ bạn bè theo cặp ID đã sắp xếp, rồi xóa lời mời. Upsert và chỉ mục
  unique tránh tạo trùng khi người dùng thử lại; không xóa lời mời nếu lưu quan hệ bị lỗi.
- `POST /api/friends/requests/:requestId/decline`: xóa lời mời, HTTP 204 không có body.
- Cả hai yêu cầu `Authorization: Bearer <access_token>`, không cần body. `requestId`
  là ID lời mời (chuỗi 24 ký tự hex), người xử lý phải là người nhận trong lời mời.
- HTTP 400 nếu ID sai; 403 nếu không có quyền; 404 nếu lời mời không còn tồn tại.
  Chấp nhận còn trả 404 nếu người gửi đã xóa tài khoản; vẫn có thể từ chối lời mời đó.
- Hồ sơ trả về chỉ gồm thông tin công khai. API danh sách người dùng sẽ phản ánh
  `friendshipStatus: "friends"` sau khi chấp nhận, hoặc `"none"` sau khi từ chối.

## Phiên đăng nhập mobile

`POST /api/auth/signin` nhận thêm `client: "mobile"` cùng username/password để trả
`{accessToken, refreshToken}` trong JSON. Native app lưu token trong MMKV mã hóa,
khóa mã hóa trong Keychain/Keystore; không dựa vào cookie trên HTTP local.

`POST /api/auth/refresh` và `/api/auth/signout` nhận JSON
`{ "client": "mobile", "refreshToken": "..." }`. Refresh trả `{accessToken}` mới;
signout thu hồi session và trả 204. Access token sống 30 phút, refresh token 14 ngày.
Trình duyệt không gửi `client: "mobile"` tiếp tục dùng cookie HttpOnly/Secure/SameSite=None;
refresh token không xuất hiện trong JSON của browser signin. Không ghi token vào log.

## Socket.IO: kết nối cơ bản

Socket.IO dùng chung HTTP server/cổng với Express trong `src/socket/index.js`.
`setupSocket(httpServer)` cấu hình server bằng function/factory, chỉ gắn xác thực JWT
và hai sự kiện vòng đời `connection`/`disconnect`.

Frontend gửi access token qua `auth.token`; `socketAuthMiddleware` xác minh JWT,
kiểm tra tài khoản còn tồn tại rồi gọi `next()` để cho kết nối đi tiếp.
Token thiếu, sai hoặc hết hạn sẽ trả `connect_error` với mã `UNAUTHORIZED`.

Khi đăng nhập trên app, đối chiếu log `[socket] BE nhận kết nối:` ở terminal backend
và `[socket] FE đã kết nối BE:` ở console của app: hai bên phải có cùng socket ID.
Khi logout, frontend chủ động disconnect và backend nhận sự kiện disconnect.
Mỗi function chính có một khối comment tiếng Việt ngắn mô tả chức năng.

## Kiểm tra

Chạy `npm test`. Test controller và đăng ký route dùng Node test runner cùng mock
query Mongoose; không cần mở server và không đọc/ghi cơ sở dữ liệu thật.
