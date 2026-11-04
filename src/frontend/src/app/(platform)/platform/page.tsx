import Link from 'next/link';

export default async function PlatformOverviewPage() {
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
      <div className="p-6 bg-white rounded-xl shadow-xs border border-[#E8E2D9]">
        <h2 className="text-2xl font-bold text-[#1A1917]">RecipeHub R&amp;D Platform Foundation</h2>
        <p className="mt-2 text-[#706E68]">
          Hệ thống quản lý công thức R&amp;D chuỗi đồ uống (Clean Architecture microservices skeleton).
        </p>
        
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F5F0E8] text-[#706E68] border border-[#E8E2D9]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Gateway Status: <span className="font-semibold text-[#1A1917]">{gatewayStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-xs border border-[#E8E2D9] hover:border-[#C9A84C] transition">
          <div className="text-[#B47820] font-semibold uppercase text-xs tracking-wider">Role Module</div>
          <h3 className="mt-2 text-xl font-bold text-[#1A1917]">Administrator</h3>
          <p className="mt-2 text-sm text-[#706E68]">
            Quản trị hệ thống, phân quyền người dùng, xem audit logs.
          </p>
          <div className="mt-4">
            <Link
              href="/admin"
              className="inline-block px-4 py-2 bg-[#1A1917] text-white rounded-md text-sm font-medium hover:bg-[#292524] shadow-xs"
            >
              Vào Không Gian Admin &rarr;
            </Link>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-xs border border-[#E8E2D9] hover:border-[#C9A84C] transition">
          <div className="text-[#B47820] font-semibold uppercase text-xs tracking-wider">Role Module</div>
          <h3 className="mt-2 text-xl font-bold text-[#1A1917]">R&amp;D Specialist</h3>
          <p className="mt-2 text-sm text-[#706E68]">
            Nghiên cứu công thức, điều chỉnh nguyên liệu, phiên bản SOP.
          </p>
          <div className="mt-4">
            <Link
              href="/rnd"
              className="inline-block px-4 py-2 bg-[#B47820] text-white rounded-md text-sm font-medium hover:bg-[#9A6416] shadow-xs"
            >
              Vào Không Gian R&amp;D &rarr;
            </Link>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-xs border border-[#E8E2D9] hover:border-[#C9A84C] transition">
          <div className="text-[#B47820] font-semibold uppercase text-xs tracking-wider">Role Module</div>
          <h3 className="mt-2 text-xl font-bold text-[#1A1917]">Viewer / Operation</h3>
          <p className="mt-2 text-sm text-[#706E68]">
            Xem quy trình chuẩn (SOP), hướng dẫn pha chế cửa hàng.
          </p>
          <div className="mt-4">
            <Link
              href="/viewer"
              className="inline-block px-4 py-2 bg-white text-[#1A1917] border border-[#E8E2D9] rounded-md text-sm font-medium hover:bg-[#F5F0E8] shadow-xs"
            >
              Vào Không Gian Viewer &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 bg-[#F5F0E8] border border-[#E8E2D9] rounded-xl text-[#706E68] text-sm">
        <strong className="text-[#1A1917]">Lưu ý kỹ thuật:</strong> Đây là technical foundation skeleton phục vụ kiểm tra kiến trúc nền tảng (YARP, gRPC, Redis Streams, PostgreSQL). Nghiệp vụ công thức, đăng nhập JWT thực tế và logic CRUD được vận hành trên hạ tầng microservices chuẩn.
      </div>
    </div>
  );
}
