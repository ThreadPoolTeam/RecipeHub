export default function ViewerPage() {
  return (
    <div className="space-y-4">
      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
          Viewer / Store Barista Role
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Tra cứu Quy trình Pha chế (SOP)</h1>
        <p className="text-slate-600 mt-1">
          Khu vực tra cứu nhanh tỷ lệ thành phần, hướng dẫn thao tác tại quầy bar và tài liệu hướng dẫn.
        </p>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Trạng thái module</h2>
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
            <strong>Placeholder:</strong> Chế độ xem chỉ đọc và tài liệu hướng dẫn số hoá sẽ được kết nối tới <code>RecipeHub.Content.Api</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
