import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function ChannelsList({ initData, showToast, onRefresh }) {
  const [channels, setChannels] = useState([]);
  const [msgs, setMsgs] = useState({});

  useEffect(() => {
    fetch(`${API}/tasks/channels`, { headers: { 'x-telegram-initdata': initData } })
      .then(r => r.json()).then(setChannels).catch(console.error);
  }, [initData]);

  const verify = async (ch) => {
    showToast('Проверяем подписку...', 'info');
    const res = await fetch(`${API}/tasks/channels/${ch.id}/verify`, {
      method: 'POST', headers: { 'x-telegram-initdata': initData },
    });
    const d = await res.json();
    if (res.ok) {
      setMsgs({ ...msgs, [ch.id]: `+${d.reward_usdt} USDT, +${d.reward_coin} 🪙` });
      showToast(`+${d.reward_usdt} USDT, +${d.reward_coin} 🪙`, 'success');
      if (onRefresh) onRefresh();
    } else {
      setMsgs({ ...msgs, [ch.id]: d.error });
      showToast(d.error || 'Ошибка', 'error');
    }
  };

  return (
    <>
      {channels.map(ch => (
        <div key={ch.id} className="card">
          <h4>{ch.channel_username}</h4>
          <p>+{ch.reward_usdt} USDT / +{ch.reward_coin} 🪙</p>
          <button onClick={() => { window.open(`https://t.me/${ch.channel_username.replace('@', '')}`, '_blank'); showToast('Открываем канал...'); }}>Подписаться</button>
          <button onClick={() => verify(ch)} style={{ marginLeft: 8 }}>Проверить</button>
          {msgs[ch.id] && <p className="success">{msgs[ch.id]}</p>}
        </div>
      ))}
      {channels.length === 0 && <p className="hint">Пока нет каналов.</p>}
    </>
  );
}