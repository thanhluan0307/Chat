# ChatApp

Ứng dụng React Native CLI + TypeScript, dùng React Navigation 7, React Hook Form và Axios.

## Chạy dự án

```sh
cd frontend
npm install
cd ios && bundle exec pod install && cd ..
npm start
```

Mở terminal khác ở `frontend` và chạy `npm run ios` hoặc `npm run android`.
Cần build lại native sau khi thêm thư viện có mã iOS/Android.

Chạy backend ở terminal riêng từ thư mục gốc dự án: `cd backend && npm install && npm run dev`.
Backend mặc định dùng cổng `5001` và cần cấu hình MongoDB trong `backend/.env`.

API được cấu hình ở `src/config/api.ts`: bản development dùng địa chỉ LAN của Metro;
nếu Metro chạy qua loopback thì dùng `localhost` trên iOS hoặc `10.0.2.2` trên Android.
Nếu backend chạy ở máy/cổng khác, sửa `API_BASE_URL`. Trước khi phát hành, đặt URL
HTTPS của backend cho nhánh production trong file này.

## Điều hướng

```text
RootStack
├── Login                           ngoài bottom tab
├── Register                        ngoài bottom tab
└── Sau khi đăng nhập thành công
    ├── MainTabs
    │   ├── Chats                   Chat
    │   ├── Friends                 Bạn bè
    │   ├── Notifications           Thông báo
    │   └── Profile                 Cá nhân
    └── Conversation                ngoài bottom tab
```

App khôi phục phiên đã lưu khi mở lại. Nếu chưa có phiên hoặc refresh token đã hết hạn,
app yêu cầu **Tên đăng nhập** và **Mật khẩu**.
Chỉ mở 4 tab khi `POST /api/auth/signin` trả access token hợp lệ và
`GET /api/users/me` xác nhận được tài khoản. Không có đường vào bằng tài khoản khách.
Nhấn **Đăng ký ngay** để tạo tài khoản với họ, tên, username, email và mật khẩu.
Form kiểm tra email, mật khẩu tối thiểu 8 ký tự và xác nhận mật khẩu trùng khớp.
Đăng ký gọi `POST /api/auth/signup`; thành công quay lại Đăng nhập và điền sẵn
username. Mật khẩu không được đưa vào route hoặc giữ lại trên màn Đăng nhập.
Màn Chi tiết cuộc trò chuyện nằm ngoài bottom tab. Quay lại sẽ trở về đúng tab
trước đó. **Đăng xuất** ở Cá nhân quay về màn Đăng nhập
và loại bỏ lịch sử của phiên đăng nhập.

Phiên (access token, refresh token và hồ sơ; không lưu mật khẩu) được lưu trong
MMKV mã hóa AES-256. Khóa mã hóa ngẫu nhiên giữ trong iOS Keychain/Android Keystore
qua `react-native-keychain`. Trạng thái phiên khi app chạy vẫn do React Hook Form quản lý.
Axios tự gọi `POST /api/auth/refresh` khi request được xác thực nhận 401/403, chia sẻ
một lần refresh giữa các request đồng thời rồi thử lại mỗi request tối đa một lần.
Backend cấp refresh token cho native client với `client: "mobile"`; thời hạn hiện tại
là 14 ngày, sau đó cần đăng nhập lại. Mất mạng không xóa phiên đã lưu.
Đăng xuất xóa MMKV trước khi gọi server thu hồi refresh token; phản hồi refresh cũ
không thể khôi phục phiên vừa đăng xuất. Lỗi đọc/xóa bộ nhớ có thông báo thử lại.
Sau khi cài thư viện native, chạy lại `bundle exec pod install` trong `ios` nếu cần
và build lại app bằng `npm run ios` hoặc `npm run android`; reload Metro chưa đủ.
Màn Chat lấy danh sách thật qua `GET /api/conversations`, có loading, lỗi/thử lại,
kéo để làm mới và tải lại khi tab được focus. Danh sách rỗng hiển thị view
**Chưa có cuộc trò chuyện**; tìm kiếm không khớp hiển thị trạng thái riêng.
Tab Bạn bè hiển thị thư mục người dùng thật qua `GET /api/users?page=1&limit=20`.
Cuộn cuối danh sách hoặc nhấn **Tải thêm** để lấy trang tiếp theo. Kéo để làm mới
sẽ tải lại trang một; lỗi trang sau giữ các dòng đã tải và cho thử lại cùng trang.
Danh sách loại tài khoản hiện tại và hiển thị tên, username của người dùng khác.
Mỗi người có nút **Kết bạn** khi chưa có quan hệ. Nhấn để nhập lời nhắn tùy chọn
(tối đa 300 ký tự) rồi **Gửi lời mời**; gửi qua `POST /api/friends/requests`.
Form dùng RHF, có trạng thái đang gửi, chặn gửi lặp và cho thử lại khi lỗi mạng.
Thành công hiển thị **Đã gửi**; backend trả `friendshipStatus` trong API thư mục
để giữ trạng thái đúng khi tìm kiếm, phân trang hoặc mở lại tab/app. Người đã là bạn
hiển thị nhãn **Bạn bè** và nút **Nhắn tin**; **Xem lời mời** dẫn tới mục **Đã nhận** của tab Thông báo.
HTTP 409 hiển thị lỗi của server, khóa gửi lại và làm mới trạng thái quan hệ.
Ô **Tìm bạn** dùng RHF, chờ 300 ms hoặc nhấn Search để gửi `search` lên API.
Backend tìm một phần tên/username không phân biệt hoa thường, trước khi phân trang;
không tự bỏ dấu tiếng Việt. Đổi từ khóa tải lại trang một, hủy request cũ, xóa từ khóa
trở về danh sách đầy đủ; không khớp hiển thị **Không tìm thấy người dùng**.
Tab **Thông báo** có hai mục **Đã nhận** và **Đã gửi**, kèm số lượng lời mời đang chờ.
Dữ liệu lấy từ `GET /api/friends/requests` qua `api/friends`; người đối diện được
chuẩn hóa từ `from`/`to`. Mỗi dòng hiển thị tên, username, lời nhắn nếu có và thời gian.
Danh sách mới nhất trước, có loading, lỗi/thử lại, trạng thái rỗng theo từng mục và
kéo để làm mới. Mở lại tab sẽ cập nhật cả hai danh sách; chuyển mục không gọi lại API.
Lỗi làm mới giữ danh sách đã tải cùng nút thử lại; tài khoản đã xóa có tên thay thế.
Trong **Đã nhận**, mỗi lời mời có **Đồng ý** và **Từ chối**, gọi POST
`/friends/requests/:requestId/accept` hoặc `/decline` bằng ID lời mời.
Hai nút của cùng lời mời bị khóa khi đang xử lý; các dòng khác vẫn thao tác được.
Thành công xóa dòng, cập nhật số lượng và thông báo kết quả; lỗi giữ dòng để thử lại.
Lời mời không còn tồn tại sẽ tải lại danh sách. API GET cũ bị hủy để không làm xuất hiện
lại lời mời vừa xử lý. Người đã xóa tài khoản chỉ có thể được từ chối; tab **Đã gửi**
không hiển thị các nút xử lý của người nhận. Quay lại Bạn bè sẽ tải quan hệ mới từ backend.

Sau khi kết bạn, nhấn **Bạn bè → Nhắn tin** hoặc **Thông báo → Đồng ý → Nhắn tin ngay**.
`useOpenConversation` gọi `POST /api/conversations` với `{type: "direct", memberIds: [friendId]}`;
backend tạo phòng nếu chưa có hoặc trả lại phòng cũ. Nhận phòng hợp lệ mới mở màn Chi tiết
bằng ID thật, tên và ID người nhận. Nút có loading, chặn bấm trùng, lỗi/thử lại và hủy
request khi rời tab. Cuộc trò chuyện được lưu phía backend; tab Chat đang mở tự cập nhật khi có phòng mới.

Màn Chi tiết dùng `api/messages` để tải 50 tin gần nhất qua
`GET /api/conversations/:conversationId/messages`; chưa có phân trang tin cũ trên UI.
Phòng trống hiển thị **Chưa có tin nhắn** và lời mời gửi lời chào. Gửi văn bản tối đa
4000 ký tự qua `POST /api/messages/direct` hoặc `/group`, dùng RHF quản lý draft và
trạng thái. Thêm tin khi server xác nhận qua HTTP hoặc socket, gộp theo `_id` để không trùng.
Chỉ clear draft khi HTTP thành công; lỗi giữ draft để gửi lại.
Backend kiểm tra quyền thành viên khi đọc lịch sử và đúng cặp người gửi/nhận khi gửi direct.
Gửi tin vẫn dùng HTTP; tin nhận cập nhật ngay qua Socket.IO. Khi reconnect, màn đang mở
tải lại 50 tin gần nhất để bù dữ liệu; kéo làm mới và mở lại phòng cũng tải từ API.

Các state của base dùng React Hook Form: session trong `SessionProvider`,
username/password/validation/submitting/error trong `useLoginForm`, tìm kiếm và trạng thái tải danh sách ở `useChats`,
đăng ký và xác nhận mật khẩu trong `useRegisterForm`,
người dùng/phân trang/trạng thái tải trong `useUsers`,
lời mời/bộ lọc/trạng thái tải trong `useFriendRequests`,
và draft/danh sách tin nhắn ở Chi tiết. `useWatch` đọc giá trị cần render;
`getValues` chỉ dùng trong handler. `FormTextInput` nối TextInput với `useController`.

## Cấu trúc

```text
src/
├── api/              HTTP client và API theo từng domain
├── config/           Địa chỉ API theo môi trường
├── components/       Screen, AppButton, Avatar, PersonRow
├── hooks/            Hook dùng chung, mở/tạo phòng trò chuyện
├── navigation/       AppNavigator, RootNavigator, BottomTabNavigator
│   ├── routes.ts     Tên route tập trung
│   ├── types.ts      Kiểu tham số route và props màn hình
│   └── navigationRef.ts
├── providers/        AppProviders và SessionProvider
├── screens/          Mỗi màn một thư mục
├── services/         Luồng nghiệp vụ ghép nhiều API
└── theme/            Màu navigation sáng/tối theo hệ thống
```

`App.tsx` chỉ ghép providers và navigator. `NavigationContainer` chỉ có một instance.
Các màn dùng `useTheme()` để lấy màu và `Screen` để xử lý safe area.

Thêm tab: cập nhật `routes.ts`, `MainTabParamList`, tạo screen rồi đăng ký trong
`BottomTabNavigator`. Thêm màn toàn màn hình: khai báo ở `RootStackParamList` và
đăng ký trong `RootNavigator`, ngang hàng với `MainTabs`.

```tsx
navigation.navigate(RouteName.Conversation, {
  conversationId: room._id,
  title: friend.displayName,
  type: 'direct',
  recipientId: friend._id,
});
```

Các screen trong tab dùng `TabScreenProps`, screen bên ngoài dùng `RootScreenProps`.
Chỉ truyền ID và dữ liệu có thể serialize qua route. Với điều hướng từ ngoài component,
chỉ gọi `navigationRef` sau khi `navigationRef.isReady()` trả về `true`.

Android đã cấu hình `RNScreensFragmentFactory` để khôi phục màn an toàn khi Activity
được tạo lại và tắt predictive back theo hướng dẫn của React Navigation 7.

## Tổ chức API

```text
src/api/
├── endpoints.ts      Đường dẫn API dùng chung, export API_ENDPOINTS
├── http/
│   ├── client.ts     Axios instance và interceptors
│   ├── errors.ts     ApiError và chuẩn hóa lỗi
│   └── index.ts
├── auth/
│   ├── api.ts        signIn, signUp, signOut
│   ├── types.ts      Request, response và session
│   └── index.ts
├── conversations/
│   ├── api.ts        getConversations, createDirectConversation
│   ├── types.ts      Kiểu danh sách trả về từ backend
│   └── index.ts
├── messages/         getMessages, sendMessage và ChatMessage
└── users/
    ├── api.ts        getMe, getUsers
    ├── types.ts      UserProfile, UserSummary và phân trang
    └── index.ts
```

`httpClient` có `baseURL`, timeout 15 giây, cookie và JSON dùng chung. Request
interceptor đọc access token từ session RHF ở thời điểm gửi, thay vì lưu thêm một
bản token riêng. Header Authorization truyền tường minh được ưu tiên; đăng xuất
hoặc unmount provider sẽ không để request tiếp theo dùng token cũ.

Response interceptor đưa lỗi HTTP, mạng, timeout và JSON lỗi về `ApiError`.
Lỗi hủy request được giữ nguyên để caller nhận biết bằng `axios.isCancel()`.
Interceptor không hiển thị Alert hay điều hướng; form/hook quyết định thông báo UI.

API từng domain chỉ chứa endpoint, payload và kiểm tra dữ liệu trả về. Luồng
`services/authService.ts` ghép `auth.signIn` và `users.getMe`, rồi mới trả session
cho provider. Screen không tự tạo Axios instance hoặc gọi HTTP trực tiếp.

Khai báo đường dẫn tại `api/endpoints.ts` và dùng `API_ENDPOINTS.auth.signIn`,
`API_ENDPOINTS.auth.signUp`, `API_ENDPOINTS.auth.signOut`, `API_ENDPOINTS.users.me`, `API_ENDPOINTS.users.list`,
`API_ENDPOINTS.conversations.list`
`API_ENDPOINTS.conversations.messages`, `API_ENDPOINTS.messages.direct/group`
trong các hàm gọi API.

Ví dụ thêm API mới: tạo `api/friends/api.ts`, `types.ts`, `index.ts`; tái sử
dụng client, định nghĩa request/response và trả dữ liệu đã kiểm tra về hook/service.

```ts
import { httpClient } from '../http';
import { API_ENDPOINTS } from '../endpoints';

const { data } = await httpClient.get<unknown>(API_ENDPOINTS.conversations.list);
// Validate data against the API contract before returning it to callers.
```

Có thể truyền `params`, `headers`, `signal` và các cấu hình chuẩn của Axios vào từng
request. Cách cấu hình instance và interceptor theo [tài liệu Axios](https://axios-http.com/docs/instance).

## Kiểm tra

```sh
npm run lint
npx tsc --noEmit
npm test -- --runInBand
```

Test tương tác dùng navigator và Axios thật, mock ở HTTP adapter: kiểm tra dữ liệu bắt buộc,
từ chối sai mật khẩu/token, lỗi kết nối, đăng nhập, tìm kiếm, tạo/mở lại phòng, gửi tin nhắn qua HTTP,
quay lại đúng tab và đăng xuất để xóa lịch sử điều hướng.
Các test đăng ký kiểm tra trường bắt buộc, email, xác nhận mật khẩu, username trùng,
payload gửi API và luồng trở về Đăng nhập sau HTTP 204; không tạo tài khoản trong DB.
Test HTTP client kiểm tra token thay đổi/xóa, header tường minh, lỗi máy chủ,
timeout, JSON không hợp lệ và hủy request.
Test danh sách Chat kiểm tra loading, dữ liệu rỗng, tên đối phương/nhóm, số chưa đọc
của chính người dùng, lọc tìm kiếm, lỗi/thử lại và bỏ qua phản hồi của request cũ.
Test thư mục người dùng kiểm tra query phân trang/token, dữ liệu rỗng, nối trang
không trùng ID, hết dữ liệu, tải lại trang lỗi, chặn request đồng thời và refresh
trong lúc đang tải trang tiếp theo. Backend có bộ test riêng bằng `cd backend && npm test`.


## Chat realtime với Socket.IO

`socketService.ts` có `createSocket(accessToken)`, `connectSocket(socket)` và
`disconnectSocket(socket)`. `SocketConnection` cung cấp cùng một instance qua `useSocket()`:
chờ khôi phục/đăng nhập xong mới kết nối, đổi instance khi token đổi, xóa listener và
ngắt kết nối khi logout. Mỗi màn dùng `on(event, handler)` và dọn bằng `off(event, handler)`
khi blur/unmount để không xóa listener của màn khác.

`SOCKET_URL` lấy cùng host/cổng với API, bỏ `/api`. Handshake gửi JWT qua `auth.token`;
BE tự cho socket vào `user:<userId>` từ JWT, client không tự chọn phòng.
Các tên sự kiện ở `src/services/chatEvents.ts` khớp `backend/src/socket/events.js`.

| Sự kiện | Nơi phát → nơi nghe | Xử lý |
| --- | --- | --- |
| `new-message` | BE → `useMessages`, `useChats` | Thêm tin đúng phòng, làm mới preview/số chưa đọc ở tab Chat đang mở. |
| `conversation-created` | BE → `useChats` | Tải lại danh sách khi có phòng mới, gồm cả phòng chưa có tin. |
| `connect` | Socket.IO → màn đang mở | Tải lại dữ liệu sau kết nối/reconnect. |

```text
FE gửi POST /messages/direct hoặc /group
  → BE kiểm tra quyền, lưu Message và cập nhật Conversation
  → BE emit('new-message') tới phòng riêng của các thành viên
  → FE on('new-message') nhận tin và gộp theo message._id
```

Mọi thiết bị của người gửi/người nhận đều được nhận sự kiện. Payload lỗi hoặc tin của
phòng khác bị bỏ qua ở màn Chi tiết. HTTP ACK và socket có thể đến theo thứ tự khác nhau;
Map theo `_id` giữ mỗi tin một bản, kể cả khi GET lịch sử cũ trả về muộn.
Frontend vẫn dùng RHF quản lý dữ liệu hiển thị; socket instance là tài nguyên kết nối dùng chung.

Kiểm tra thủ công: dùng hai tài khoản đã kết bạn trên hai thiết bị/simulator, mở cùng
cuộc trò chuyện rồi gửi tin qua lại. Tin phải xuất hiện ngay ở máy còn lại; ở tab Chat,
preview và số chưa đọc cập nhật khi nhận sự kiện. Ngắt mạng rồi kết nối lại để kiểm tra tải bù.
