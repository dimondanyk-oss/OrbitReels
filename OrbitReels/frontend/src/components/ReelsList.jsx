import { useEffect, useState, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function ReelsList({ initData, showToast, onRefresh }) {
  const [reels, setReels] = useState([]);
  const [sel, setSel] = useState(null);
  const [token, setToken] = useState(null);
  const [dur, setDur] = useState(0);
  const [msg, setMsg] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    fetch(`${API}/tasks/reels`, { headers: { 'x-telegram-initdata': initData } })
      .then(r => r.json()).then(setReels).catch(console.error);
  }, [initData]);

  const start = async (reel) => {
    const res = await fetch(`${API}/tasks/reels/${reel.id}/start`, {
      method: 'POST', headers: { 'x-telegram-initdata': initData },
    });
    const d = await res.json();
    if (!res.ok) { showToast(d.error || 'Ошибка', 'error'); return; }
    setSel(reel); setToken(d.session_token); setDur(0); setMsg('');
    if (showToast) showToast(d.paid ? 'Оплачиваемый просмотр' : 'Просмотр за монеты', 'info');
    const t0 = Date.now();
    timer.current = setInterval(() => setDur(Math.floor((Date.now() - t0) / 1000)), 1000);
  };

  const complete = async () => {
    const res = await fetch(`${API}/tasks/reels/${sel.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-initdata': initData },
      body: JSON.stringify({ session_token: token, client_duration: dur }),
    });
    const d = await res.json();
    clearInterval(timer.current);
    if (res.ok) {
      setMsg(`+${d.reward_usdt} USDT, +${d.reward_coin} COIN`);
      showToast(`+${d.reward_usdt} USDT, +${d.reward_coin} COIN`, 'success');
      if (onRefresh) onRefresh();
      setTimeout(() => { setSel(null); setToken(null); }, 1500);
    } else {
      setMsg(d.error);
      showToast(d.error || 'Ошибка', 'error');
    }
  };

  const close = () => { clearInterval(timer.current); setSel(null); setToken(null); };

  return (
    <>
      {reels.map(r => (
        <div key={r.id} className="card">
          <h4>{r.title}</h4>
          <p>{r.platform} · {r.duration_required} сек · +{r.reward_usdt} USDT / +{r.reward_coin} 🪙</p>
          <button onClick={() => start(r)}>Смотреть</button>
        </div>
      ))}
      {reels.length === 0 && <p className="hint">Пока нет рилсов.</p>}

      {sel && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{sel.title}</h3>
            <div className="video-wrapper">
              <iframe src={sel.embed_code} title={sel.title} allowFullScreen frameBorder="0" />
              <div className="blocker" />
            </div>
            <p>Просмотрено: {dur} сек.</p>
            {msg && <p className="success">{msg}</p>}
            <button disabled={dur < sel.duration_required} onClick={complete}>Я посмотрел</button>
            <button onClick={close} style={{ background: 'transparent', color: '#fff', border: '1px solid #555', marginLeft: 8 }}>Закрыть</button>
          </div>
        </div>
      )}
    </>
  );
}