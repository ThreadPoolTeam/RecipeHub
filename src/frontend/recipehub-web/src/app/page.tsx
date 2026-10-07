import Link from 'next/link';

export default async function HomePage() {
  const gatewayUrl = process.env.GATEWAY_INTERNAL_URL || 'http://localhost:5000';
  let gatewayStatus = 'Unknown (Local / Offline)';

  try {
    const res = await fetch(`${gatewayUrl}/health/live`, { cache: 'no-store' });
    if (res.ok) {
      gatewayStatus = 'Connected (Healthy)';
    } else {
      gatewayStatus = `Degraded (HTTP ${res.status})`;
    }
  } catch {
    gatewayStatus = 'Unavailable / Disconnected';
  }

  return (
    <div className="space-y-8">
      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800">RecipeHub R&D Platform Foundation</h2>
        <p className="mt-2 text-slate-600">
          Hệ thống quản lý công thức R&D chuỗi đồ uống (Clean Architecture microservices skeleton).
        </p>
        
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Gateway Status: <span className="font-semibold text-slate-900">{gatewayStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-blue-400 transition">
          <div className="text-blue-600 font-semibold uppercase text-xs tracking-wider">Role Module</div>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Administrator</h3>
          <p className="mt-2 text-sm text-slate-600">
            Quản trị hệ thống, phân quyền người dùng, xem audit logs.
          </p>
          <div className="mt-4">
            <Link
              href="/admin"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              Vào Không Gian Admin &rarr;
            </Link>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-emerald-400 transition">
          <div className="text-emerald-600 font-semibold uppercase text-xs tracking-wider">Role Module</div>
          <h3 className="mt-2 text-xl font-bold text-slate-900">R&D Specialist</h3>
          <p className="mt-2 text-sm text-slate-600">
            Nghiên cứu công thức, điều chỉnh nguyên liệu, phiên bản SOP.
          </p>
          <div className="mt-4">
            <Link
              href="/rnd"
              className="inline-block px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700"
            >
              Vào Không Gian R&D &rarr;
            </Link>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-purple-400 transition">
          <div className="text-purple-600 font-semibold uppercase text-xs tracking-wider">Role Module</div>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Viewer / Operation</h3>
          <p className="mt-2 text-sm text-slate-600">
            Xem quy trình chuẩn (SOP), hướng dẫn pha chế cửa hàng.
          </p>
          <div className="mt-4">
            <Link
              href="/viewer"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
            >
              Vào Không Gian Viewer &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
        <strong>Lưu ý kỹ thuật:</strong> Đây là technical foundation skeleton phục vụ kiểm tra kiến trúc nền tảng (YARP, gRPC, Redis Streams, PostgreSQL). Nghiệp vụ công thức, đăng nhập JWT thực tế và logic CRUD được trì hoãn theo phạm vi kế hoạch.
      </div>
    </div>
  );
}
