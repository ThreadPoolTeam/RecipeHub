export default function AdminPage() {
  return (
    <div className="space-y-4">
      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
          Administrator Role
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Bảng điều khiển Quản trị viên</h1>
        <p className="text-slate-600 mt-1">
          Khu vực quản lý danh mục hệ thống, tài khoản nhân sự và truy vết nhật ký Audit.
        </p>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Trạng thái module</h2>
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
            <strong>Placeholder:</strong> Các nghiệp vụ phân quyền chi tiết (RBAC) và bảng tra cứu Audit Log đang được kết nối hạ tầng tới <code>RecipeHub.Identity.Api</code> và <code>RecipeHub.Audit.Api</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
