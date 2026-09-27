import OrbitScene from '../three/OrbitScene';

export default function HomePage({ profile, onNavigate, tariffs, showToast }) {
  const nextDraw = () => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="dashboard">
      <div className="earth-scene">
        <OrbitScene />
        <button className="watch-reels-btn"
          onClick={() => { showToast('Открываем задания...'); onNavigate('tasks'); }}>
          СМОТРЕТЬ РИЛСЫ ▶
        </button>
      </div>

      <div className="section">
        <h2 className="section-title">ТАРИФНЫЕ ПЛАНЫ</h2>
        <div className="tariffs-grid">
          {tariffs.map((t, i) => (
            <div key={t.id} className={`tariff-card tier-${i}`}>
              <div className="tariff-hex">{i + 1}</div>
              <div className="tariff-body">
                <div className="tariff-name">{t.name.toUpperCase()}</div>
                <div className="tariff-desc">{t.paid_reels_daily} рилсов в сутки оплачиваемые</div>
              </div>
              <div className="tariff-price">${t.price_usdt}</div>
              <button
                className={t.price_usdt === 0 ? 'current' : 'buy'}
                onClick={() => {
                  if (t.price_usdt === 0) showToast('Это ваш текущий тариф');
                  else { showToast(`Переходим к оплате ${t.name}...`); onNavigate('tariffs'); }
                }}>
                {t.price_usdt === 0 ? 'Ваш тариф' : 'Купить'}
              </button>
            </div>
          ))}
        </div>
        <div className="tariff-note">Все тарифы действуют 24 часа</div>
      </div>

      <div className="section">
        <h2 className="section-title">КАК ЗАРАБАТЫВАТЬ?</h2>
        <div className="earn-list">
          <div className="earn-item" onClick={() => showToast('Просмотр рилса: +$0.01 и +1 монета', 'success')}>
            <span className="earn-icon">🎬</span>
            <span>Просмотр рилса</span>
            <b>+ $0.01 + 1 🪙</b>
          </div>
          <div className="earn-item" onClick={() => showToast('Просмотр рекламы: +$0.02 и +2 монеты', 'success')}>
            <span className="earn-icon">📺</span>
            <span>Просмотр рекламы</span>
            <b>+ $0.02 + 2 🪙</b>
          </div>
          <div className="earn-item" onClick={() => showToast('Подписка на канал: +$0.05 и +5 монет', 'success')}>
            <span className="earn-icon">👤</span>
            <span>Подписка на канал</span>
            <b>+ $0.05 + 5 🪙</b>
          </div>
          <div className="earn-item" onClick={() => showToast('Верификация откроется при выводе', 'info')}>
            <span className="earn-icon">🔒</span>
            <span>Верификация (при выводе)</span>
            <b style={{ color: '#ffa500' }}>0.28 USDT</b>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">БАЛАНС</h2>
        <div className="balance-cards">
          <div className="balance-card" onClick={() => showToast(`USDT: ${profile?.wallet?.usdt_balance || '0.00'}`, 'success')}>
            <div className="balance-icon usdt-icon">💵</div>
            <div className="balance-amount">${profile?.wallet?.usdt_balance || '0.00'}</div>
            <div className="balance-label">USDT</div>
          </div>
          <div className="balance-card" onClick={() => showToast(`Монеты: ${profile?.wallet?.coin_balance || 0}`, 'success')}>
            <div className="balance-icon coin-icon">🪙</div>
            <div className="balance-amount">{profile?.wallet?.coin_balance || 0}</div>
            <div className="balance-label">Монеты</div>
          </div>
        </div>
        <button className="withdraw-btn"
          onClick={() => { showToast('Открываем кошелёк...'); onNavigate('wallet'); }}>
          💸 Вывести (USDT)
        </button>
        <div className="withdraw-note">Выплаты каждый месяц</div>
      </div>

      <div className="section">
        <h2 className="section-title">РАСПРЕДЕЛЕНИЕ ПРИЗОВ</h2>
        <div className="distribution-card">
          <div className="distribution-icon">📅</div>
          <div className="distribution-text">
            Каждый месяц мы распределяем USDT между активными игроками!
          </div>
        </div>
        <div className="next-draw">
          Следующее распределение:
          <div className="draw-date">{nextDraw()}</div>
        </div>
        <button className="details-btn"
          onClick={() => showToast('Подробности в профиле', 'info')}>
          Подробнее
        </button>
      </div>

      <div className="section">
        <h2 className="section-title">РЕФЕРАЛЬНАЯ ПРОГРАММА</h2>
        <div className="referral-cards">
          {[
            { count: 1, usdt: 0.02, coin: 3, label: 'друг' },
            { count: 5, usdt: 0.10, coin: 15, label: 'друзей' },
            { count: 10, usdt: 0.20, coin: 30, label: 'друзей' },
            { count: 50, usdt: 1.00, coin: 150, label: 'друзей' },
          ].map(r => (
            <div key={r.count} className="referral-card"
              onClick={() => { showToast(`Пригласи ${r.count} ${r.label} и получи $${r.usdt}`, 'info'); onNavigate('referrals'); }}>
              <span className="referral-icon">👥</span>
              <span className="referral-count">{r.count} {r.label}</span>
              <span className="referral-reward">+ ${r.usdt.toFixed(2)} + {r.coin} 🪙</span>
            </div>
          ))}
        </div>
        <div className="ref-link-block">
          <div className="ref-label">ВАША РЕФЕРАЛЬНАЯ ССЫЛКА</div>
          <div className="ref-link">https://t.me/OrbitReelsBot?start={profile?.user?.id}</div>
          <button className="copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(`https://t.me/OrbitReelsBot?startapp=ref_${profile?.user?.id}`);
              showToast('Ссылка скопирована!', 'success');
            }}>
            Копировать
          </button>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">ИНФОРМАЦИОННЫЙ КАНАЛ</h2>
        <div className="info-channel-card">
          <div className="info-channel-text">
            Подписывайтесь на наш Telegram канал, чтобы быть в курсе новостей и обновлений!
          </div>
          <button className="telegram-btn"
            onClick={() => { window.open('https://t.me/orbitreels_info', '_blank'); showToast('Открываем канал...', 'info'); }}>
            ✈️
          </button>
        </div>
      </div>
    </div>
  );
}