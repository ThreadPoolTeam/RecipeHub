export default function RndPage() {
  return (
    <div className="space-y-4">
      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
          R&D Specialist Role
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Nghiên cứu & Phát triển Công thức</h1>
        <p className="text-slate-600 mt-1">
          Khu vực tạo mới công thức, thử nghiệm định lượng nguyên liệu và quản lý phiên bản phê duyệt.
        </p>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Trạng thái module</h2>
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
            <strong>Placeholder:</strong> Dữ liệu công thức chuẩn (theo tài liệu Bộ công thức Phê La) và giao diện máy tính tỷ lệ thành phần sẽ được tích hợp trong phase nghiệp vụ tiếp theo kết nối tới <code>RecipeHub.Recipe.Api</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
