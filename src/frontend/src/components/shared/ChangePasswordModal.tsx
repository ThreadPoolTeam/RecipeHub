'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { useDemo } from '@/lib/demo/provider';
import { Alert, Button, TextInput } from '@/components/workspace/fields';
import { Dialog } from '@/components/workspace/dialog';

export function ChangePasswordModal() {
  const { repo } = useDemo();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setSaving(true); setError('');
    try {
      await repo.changePassword(current, password);
      setOpen(false); setCurrent(''); setPassword(''); setConfirm('');
      router.replace('/login');
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể đổi mật khẩu.'); }
    finally { setSaving(false); }
  };
  return <>
    <Button size="sm" onClick={() => { setOpen(true); setError(''); }}><KeyRound className="w-4 h-4 mr-1.5" />Đổi mật khẩu</Button>
    <Dialog isOpen={open} onClose={() => { if (!saving) { setOpen(false); setCurrent(''); setPassword(''); setConfirm(''); } }} title="Đổi mật khẩu"
      description="Sau khi đổi, mọi session được thu hồi. Hãy đăng nhập lại bằng mật khẩu mới."
      onConfirm={save} confirmLabel="Lưu mật khẩu" isConfirming={saving}>
      <div className="space-y-3">
        {error && <Alert variant="error">{error}</Alert>}
        <TextInput label="Mật khẩu hiện tại" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
        <TextInput label="Mật khẩu mới" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} helper="8–128 ký tự, gồm chữ hoa, chữ thường và số." />
        <TextInput label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
    </Dialog>
  </>;
}
