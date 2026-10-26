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
    │   └── Profile                 Cá nhân
    └── Conversation                ngoài bottom tab
```

App luôn mở ở màn Đăng nhập, bắt buộc nhập **Tên đăng nhập** và **Mật khẩu**.
Chỉ mở 3 tab khi `POST /api/auth/signin` trả access token hợp lệ và
`GET /api/users/me` xác nhận được tài khoản. Không có đường vào bằng tài khoản khách.
Nhấn **Đăng ký ngay** để tạo tài khoản với họ, tên, username, email và mật khẩu.
Form kiểm tra email, mật khẩu tối thiểu 8 ký tự và xác nhận mật khẩu trùng khớp.
Đăng ký gọi `POST /api/auth/signup`; thành công quay lại Đăng nhập và điền sẵn
username. Mật khẩu không được đưa vào route hoặc giữ lại trên màn Đăng nhập.
Chọn một người ở tab Chat hoặc Bạn bè để mở cuộc trò chuyện không có bottom tab.
Quay lại sẽ trở về đúng tab trước đó. **Đăng xuất** ở Cá nhân quay về màn Đăng nhập
và loại bỏ lịch sử của phiên đăng nhập.

Đăng nhập, lấy hồ sơ và yêu cầu đăng xuất đã nối với API backend hiện có. Token chỉ
giữ trong bộ nhớ: đóng và mở lại ứng dụng sẽ yêu cầu đăng nhập lại. Chưa tự refresh
token. Đăng xuất luôn xóa phiên trên máy, kể cả khi máy chủ không phản hồi.
Màn Chat lấy danh sách thật qua `GET /api/conversations`, có loading, lỗi/thử lại,
kéo để làm mới và tải lại khi tab được focus. Danh sách rỗng hiển thị view
**Chưa có cuộc trò chuyện**; tìm kiếm không khớp hiển thị trạng thái riêng.
Danh bạ và lịch sử tin nhắn trong màn Chi tiết vẫn là phần mẫu, chưa nối Socket.IO.

Các state của base dùng React Hook Form: session trong `SessionProvider`,
username/password/validation/submitting/error trong `useLoginForm`, tìm kiếm và trạng thái tải danh sách ở `useChats`,
đăng ký và xác nhận mật khẩu trong `useRegisterForm`,
và draft/danh sách tin nhắn ở Chi tiết. `useWatch` đọc giá trị cần render;
`getValues` chỉ dùng trong handler. `FormTextInput` nối TextInput với `useController`.

## Cấu trúc

```text
src/
├── api/              HTTP client và API theo từng domain
├── config/           Địa chỉ API theo môi trường
├── components/       Screen, AppButton, Avatar, PersonRow
├── data/             Dữ liệu và kiểu tin nhắn mẫu
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
navigation.navigate(RouteName.Conversation, { conversationId: 'linh' });
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
│   ├── api.ts        getConversations
│   ├── types.ts      Kiểu danh sách trả về từ backend
│   └── index.ts
└── users/
    ├── api.ts        getMe
    ├── types.ts      UserProfile
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
`API_ENDPOINTS.auth.signUp`, `API_ENDPOINTS.auth.signOut`, `API_ENDPOINTS.users.me`,
`API_ENDPOINTS.conversations.list`
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
từ chối sai mật khẩu/token, lỗi kết nối, đăng nhập, tìm kiếm, gửi tin nhắn cục bộ,
quay lại đúng tab và đăng xuất để xóa lịch sử điều hướng.
Các test đăng ký kiểm tra trường bắt buộc, email, xác nhận mật khẩu, username trùng,
payload gửi API và luồng trở về Đăng nhập sau HTTP 204; không tạo tài khoản trong DB.
Test HTTP client kiểm tra token thay đổi/xóa, header tường minh, lỗi máy chủ,
timeout, JSON không hợp lệ và hủy request.
Test danh sách Chat kiểm tra loading, dữ liệu rỗng, tên đối phương/nhóm, số chưa đọc
của chính người dùng, lọc tìm kiếm, lỗi/thử lại và bỏ qua phản hồi của request cũ.
