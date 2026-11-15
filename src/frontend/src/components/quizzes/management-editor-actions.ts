export type PendingAction = 'deleteQuiz' | 'deleteVersion' | 'published' | 'archived' | 'clone';

export function actionTitle(action: PendingAction, version: number | null) {
  if (action === 'deleteQuiz') return 'Xóa toàn bộ bộ đề?';
  if (action === 'deleteVersion') return `Xóa bản nháp v${version}?`;
  if (action === 'published') return 'Ban hành phiên bản?';
  if (action === 'archived') return 'Lưu trữ phiên bản?';
  return 'Nhân bản phiên bản?';
}

export function actionDescription(action: PendingAction) {
  if (action === 'published') return 'Sau khi ban hành, nội dung phiên bản không thể chỉnh sửa. Nhân viên có quyền sẽ có thể làm bài.';
  if (action === 'archived') return 'Phiên bản ngừng nhận lượt làm mới. Kết quả đã có được giữ nguyên.';
  if (action === 'clone') return 'Tạo phiên bản nháp mới từ nội dung đã lưu của phiên bản đang xem.';
  return 'Thao tác không thể hoàn tác. Backend chỉ cho xóa bản nháp không có lượt làm bài.';
}
