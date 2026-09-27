import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function AdsList({ initData, showToast, onRefresh }) {
  const [ads, setAds] = useState([]);
  const [msgs, setMsgs] = useState({});

  useEffect(() => {
    fetch(`${API}/tasks/ads`, { headers: { 'x-telegram-initdata': initData } })
      .then(r => r.json()).then(setAds).catch(console.error);
  }, [initData]);

  const watch = async (ad) => {
    if (ad.redirect_url) window.open(ad.redirect_url, '_blank');
    setMsgs({ ...msgs, [ad.id]: 'Идёт просмотр...' });
    showToast('Идёт просмотр...', 'info');
    setTimeout(async () => {
      const res = await fetch(`${API}/tasks/ads/${ad.id}/complete`, {
        method: 'POST', headers: { 'x-telegram-initdata': initData },
      });
      const d = await res.json();
      if (res.ok) {
        setMsgs({ ...msgs, [ad.id]: `+${d.reward_usdt} USDT, +${d.reward_coin} 🪙` });
        showToast(`+${d.reward_usdt} USDT, +${d.reward_coin} 🪙`, 'success');
        if (onRefresh) onRefresh();
      } else {
        setMsgs({ ...msgs, [ad.id]: d.error });
        showToast(d.error || 'Ошибка', 'error');
      }
    }, (ad.duration_required || 15) * 1000);
  };

  return (
    <>
      {ads.map(ad => (
        <div key={ad.id} className="card">
          <h4>{ad.title}</h4>
          <p>{ad.duration_required} сек · +{ad.reward_usdt} USDT / +{ad.reward_coin} 🪙</p>
          <button onClick={() => watch(ad)}>Смотреть</button>
          {msgs[ad.id] && <p className="success">{msgs[ad.id]}</p>}
        </div>
      ))}
      {ads.length === 0 && <p className="hint">Пока нет рекламы.</p>}
    </>
  );
}