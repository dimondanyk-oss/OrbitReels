import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function ReferralPage({ initData, showToast }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!initData) return;
    fetch(`${API}/users/referrals/stats`, { headers: { 'x-telegram-initdata': initData } })
      .then(r => r.json()).then(setStats).catch(console.error);
  }, [initData]);

  if (!stats) return <div className="page"><p>Загрузка...</p></div>;

  const copy = () => {
    navigator.clipboard.writeText(stats.referralLink);
    showToast('Ссылка скопирована!', 'success');
  };

  return (
    <div className="page">
      <h2 className="page-title">🤝 РЕФЕРАЛЫ</h2>

      <div className="section">
        <h3 className="section-title">ПРИГЛАШАЙ ДРУЗЕЙ И ПОЛУЧАЙ НАГРАДЫ!</h3>
        <div className="referral-cards">
          {stats.tasks.map((t, i) => {
            const labels = ['друг', 'друзей', 'друзей', 'друзей'];
            const icons = ['👤', '👥', '👥', '👥'];
            return (
              <div key={t.id}
                className={`referral-card ${t.completed ? 'completed' : ''}`}
                onClick={() => showToast(
                  t.completed ? `✅ Выполнено: ${t.count_required}` : `Пригласи ${t.count_required} ${labels[i] || 'друзей'}`,
                  t.completed ? 'success' : 'info'
                )}>
                <span className="referral-icon">{icons[i] || '👥'}</span>
                <span className="referral-count">{t.count_required} {labels[i]}</span>
                <span className="referral-reward">
                  + ${parseFloat(t.reward_usdt).toFixed(2)} + {t.reward_coin} 🪙
                </span>
                {t.completed && <span className="check">✅</span>}
              </div>
            );
          })}
        </div>
        <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
          Приглашено друзей: {stats.totalFriends}
        </p>
      </div>

      <div className="section">
        <div className="ref-link-block">
          <div className="ref-label">ВАША РЕФЕРАЛЬНАЯ ССЫЛКА</div>
          <div className="ref-link">{stats.referralLink}</div>
          <button className="copy-btn" onClick={copy}>Копировать</button>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">ИНФОРМАЦИОННЫЙ КАНАЛ</h3>
        <div className="info-channel-card">
          <div className="info-channel-text">
            Подписывайтесь на наш Telegram канал, чтобы быть в курсе новостей и обновлений!
          </div>
          <button className="telegram-btn"
            onClick={() => { window.open('https://t.me/orbitreels_info', '_blank'); showToast('Открываем канал...'); }}>
            ✈️
          </button>
        </div>
      </div>
    </div>
  );
}