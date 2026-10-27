/** Tạo tên phòng riêng của tài khoản; chỉ backend được gán socket vào phòng này. */
export function userRoom(userId) {
  return `user:${(userId?._id ?? userId).toString()}`;
}
