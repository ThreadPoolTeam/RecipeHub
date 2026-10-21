'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Cpu } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { DemoSettings } from '@/lib/demo/types';
import { Button, TextInput, Select, Alert } from '@/components/workspace/fields';

export default function AdminAiSettingsPage() {
  const { session, repo, dataVersion, touch } = useDemo();
  const [settings, setSettings] = useState<DemoSettings>({
    idleTimeoutMinutes: 30,
    aiTextEnabled: true,
    aiImageEnabled: true,
    aiProvider: 'mock-gemini',
    simulateAiFailure: false,
    simulateMediaDeleteFailure: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    repo
      .getSettings()
      .then((s) => {
        if (mounted) setSettings(s);
      })
      .catch((err) => {
        if (mounted) setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tải cấu hình');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [repo, dataVersion]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!session) return;
    try {
      setSaving(true);
      setErrorMsg(null);
      await repo.updateSettings(session, settings);
      setSuccessMsg('Đã lưu cấu hình AI Demo & Giả lập môi trường thành công!');
      touch();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!session) return;
    const defaults: DemoSettings = {
      idleTimeoutMinutes: 30,
      aiTextEnabled: true,
      aiImageEnabled: true,
      aiProvider: 'mock-gemini',
      simulateAiFailure: false,
      simulateMediaDeleteFailure: false,
    };
    try {
      setSaving(true);
      setErrorMsg(null);
      await repo.updateSettings(session, defaults);
      setSettings(defaults);
      setSuccessMsg('Đã khôi phục cài đặt mô phỏng về giá trị mặc định');
      touch();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi khôi phục mặc định');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 bg-white border border-[#E2DDD2] rounded-xl shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Simulation &amp; Chaos Testing</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1C1917]">Cấu hình AI Demo &amp; Mô phỏng Ngoại lệ</h1>
            <p className="text-[#78716C] text-xs mt-1 max-w-2xl leading-relaxed">
              Các công tắc bên dưới dùng để mô phỏng tính năng Generative AI, thời gian chờ phiên làm việc và chủ động kích hoạt các kịch bản lỗi (Service Unavailable, Delete Failed) phục vụ kiểm thử QA &amp; bảo vệ đồ án.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetDefaults}
              disabled={loading || saving}
            >
              Khôi phục mặc định
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => handleSave()}
              isLoading={saving}
              disabled={loading}
            >
              Lưu cấu hình
            </Button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="error" onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {loading ? (
        <div className="p-12 text-center text-zinc-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]" />
          <p className="mt-3 text-xs">Đang tải thông số cấu hình hệ thống...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Core AI Providers */}
          <div className="p-6 bg-white border border-[#E2DDD2] rounded-xl shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2DDD2] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1C1917]">Bộ tạo nội dung Trí tuệ Nhân tạo</h2>
                <p className="text-xs text-[#78716C]">Điều phối mô hình AI hỗ trợ R&amp;D soạn thảo SOP và vẽ ảnh minh họa bước thực hiện.</p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FAF8F2] text-[#B47820] border border-[#E2DDD2] font-semibold">
                Mock Engine Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Nhà cung cấp Mô hình AI (AI Provider)"
                value={settings.aiProvider}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiProvider: e.target.value as 'mock-gemini' | 'mock-flux',
                  })
                }
                options={[
                  { label: 'Google Gemini 1.5 Pro (Mocked Beverage Specialist)', value: 'mock-gemini' },
                  { label: 'Black Forest Labs FLUX.1 (Mocked Food & Drink Realistic)', value: 'mock-flux' },
                ]}
                helper="Mô phỏng phản hồi từ AI endpoint theo thời gian thực"
              />

              <TextInput
                label="Thời gian hết phiên không hoạt động (Phút)"
                type="number"
                min="1"
                max="1440"
                value={settings.idleTimeoutMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    idleTimeoutMinutes: Math.max(1, Number(e.target.value) || 30),
                  })
                }
                helper="Tự động hủy session và yêu cầu đăng nhập lại khi người dùng không tương tác"
              />
            </div>

            {/* Toggle 1 & 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="flex items-start gap-3 p-4 bg-[#FAF8F2] border border-[#E2DDD2] rounded-lg cursor-pointer hover:border-[#B47820] transition">
                <input
                  type="checkbox"
                  checked={settings.aiTextEnabled}
                  onChange={(e) => setSettings({ ...settings, aiTextEnabled: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-[#C9A84C]"
                />
                <div>
                  <div className="text-sm font-semibold text-[#1C1917]">
                    Bật gợi ý văn bản AI (AI Text Generation)
                  </div>
                  <div className="text-xs text-[#78716C] mt-1 leading-relaxed">
                    Cho phép R&amp;D bấm nút &quot;AI Gợi ý mô tả / hoàn thiện bước&quot; trong trình soạn thảo công thức.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-[#FAF8F2] border border-[#E2DDD2] rounded-lg cursor-pointer hover:border-[#B47820] transition">
                <input
                  type="checkbox"
                  checked={settings.aiImageEnabled}
                  onChange={(e) => setSettings({ ...settings, aiImageEnabled: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-[#C9A84C]"
                />
                <div>
                  <div className="text-sm font-semibold text-[#1C1917]">
                    Bật tạo ảnh minh họa AI (AI Image Generation)
                  </div>
                  <div className="text-xs text-[#78716C] mt-1 leading-relaxed">
                    Cho phép sinh ảnh minh họa AI gắn thẻ &quot;AI Concept&quot; vào thư viện ảnh Media Library.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Card 2: Chaos & Simulation Fault Injection */}
          <div className="p-6 bg-white border border-rose-200 rounded-xl shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-rose-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-rose-500" /> Mô phỏng Lỗi &amp; Kiểm thử Khả năng Phục hồi (Chaos Testing)
                </h2>
                <p className="text-xs text-[#78716C]">
                  Dành riêng cho QA &amp; Hội đồng bảo vệ: Chủ động kích hoạt tình huống ngoại lệ để kiểm tra xử lý lỗi của hệ thống.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                Fault Injection
              </span>
            </div>

            <div className="space-y-4">
              {/* Toggle Simulate AI Failure */}
              <div
                className={`p-4 rounded-lg border transition ${
                  settings.simulateAiFailure
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-[#FAF8F2] border-[#E2DDD2]'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.simulateAiFailure}
                    onChange={(e) =>
                      setSettings({ ...settings, simulateAiFailure: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 accent-rose-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1C1917]">
                        Mô phỏng lỗi máy chủ AI (503 Service Unavailable)
                      </span>
                      {settings.simulateAiFailure && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-600 text-white font-bold animate-pulse">
                          ĐANG BẬT LỖI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                      Khi bật, mọi yêu cầu sinh văn bản hoặc ảnh từ AI sẽ trả về mã lỗi 503 để kiểm tra thông báo cảnh báo thân thiện trên giao diện người dùng và cơ chế không làm sập ứng dụng.
                    </p>
                  </div>
                </label>
              </div>

              {/* Toggle Simulate Media Delete Failure */}
              <div
                className={`p-4 rounded-lg border transition ${
                  settings.simulateMediaDeleteFailure
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-[#FAF8F2] border-[#E2DDD2]'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.simulateMediaDeleteFailure}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        simulateMediaDeleteFailure: e.target.checked,
                      })
                    }
                    className="mt-1 w-4 h-4 accent-rose-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1C1917]">
                        Mô phỏng lỗi xóa tệp Media (Chuyển sang trạng thái DeleteFailed)
                      </span>
                      {settings.simulateMediaDeleteFailure && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-600 text-white font-bold animate-pulse">
                          ĐANG BẬT LỖI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                      Khi bật, hành động xóa ảnh trong thư viện sẽ cố tình thất bại và chuyển tệp sang trạng thái{' '}
                      <code className="text-rose-600 font-mono font-semibold">DeleteFailed</code>. Quản trị viên sau đó có thể tắt cờ này và bấm nút &quot;Thử xóa lại&quot; tại trang Quản trị Media để chứng minh tính năng phục hồi tự động.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetDefaults}
              disabled={saving}
            >
              Hủy thay đổi
            </Button>
            <Button
              type="submit"
              variant="gold"
              isLoading={saving}
            >
              Lưu và Áp dụng ngay
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
