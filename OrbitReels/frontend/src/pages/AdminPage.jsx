import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdminPage({ initData, showToast }) {
  const [reels, setReels] = useState([]);
  const [channels, setChannels] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [form, setForm] = useState({ title: '', platform: 'youtube', url: '' });
  const [ch, setCh] = useState({ channel_username: '', reward_usdt: 0.05, reward_coin: 5 });

  const H = { 'Content-Type': 'application/json', 'x-telegram-initdata': initData };

  const load = () => {
    fetch(`${API}/admin/reels`, { headers: H }).then(r => r.json()).then(setReels).catch(() => {});
    fetch(`${API}/admin/channels`, { headers: H }).then(r => r.json()).then(setChannels).catch(() => {});
    fetch(`${API}/admin/withdrawals`, { headers: H }).then(r => r.json()).then(setWithdrawals).catch(() => {});
  };

  useEffect(() => { if (initData) load(); }, [initData]);

  const addReel = async () => {
    const res = await fetch(`${API}/admin/reels`, { method: 'POST', headers: H, body: JSON.stringify(form) });
    if (res.ok) {
      setForm({ title: '', platform: 'youtube', url: '' });
      showToast('✅ Reel добавлен', 'success');
      load();
    } else {
      const d = await res.json();
      showToast(d.error || 'Ошибка', 'error');
    }
  };

  const addChannel = async () => {
    const res = await fetch(`${API}/admin/channels`, { method: 'POST', headers: H, body: JSON.stringify(ch) });
    if (res.ok) {
      setCh({ channel_username: '', reward_usdt: 0.05, reward_coin: 5 });
      showToast('✅ Канал добавлен', 'success');
      load();
    } else showToast('Ошибка', 'error');
  };

  const approve = async (id) => {
    const tx = prompt('Tx hash (необязательно)') || '';
    await fetch(`${API}/admin/withdrawals/${id}/approve`, {
      method: 'POST', headers: H, body: JSON.stringify({ tx_hash: tx }),
    });
    showToast('✅ Вывод одобрен', 'success');
    load();
  };

  return (
    <div className="page">
      <h2 className="page-title">⚙️ АДМИН</h2>

      <div className="card">
        <h4>➕ Добавить Reel</h4>
        <input placeholder="Название" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <input placeholder="URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
        <button onClick={addReel}>Добавить</button>
      </div>

      <div className="card">
        <h4>➕ Добавить канал</h4>
        <input placeholder="@channel" value={ch.channel_username} onChange={e => setCh({ ...ch, channel_username: e.target.value })} />
        <button onClick={addChannel}>Добавить</button>
      </div>

      <div className="card">
        <h4>📺 Reels ({reels.length})</h4>
        {reels.map(r => <p key={r.id}>• {r.title} [{r.platform}]</p>)}
      </div>

      <div className="card">
        <h4>📢 Каналы ({channels.length})</h4>
        {channels.map(c => <p key={c.id}>• {c.channel_username}</p>)}
      </div>

      <div className="card">
        <h4>💸 Выводы на проверку ({withdrawals.length})</h4>
        {withdrawals.map(w => (
          <div key={w.id} style={{ marginBottom: 10 }}>
            <p>{w.amount_usdt} USDT → {w.wallet_address}</p>
            <button onClick={() => approve(w.id)}>Одобрить</button>
          </div>
        ))}
      </div>
    </div>
  );
}