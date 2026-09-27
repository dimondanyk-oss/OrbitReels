const API = import.meta.env.VITE_API_URL || '/api';

export default function TariffsPage({ tariffs, initData, showToast }) {
  const buy = async (t) => {
    showToast(`Создаём счёт на ${t.name}...`, 'info');
    const res = await fetch(`${API}/payments/cryptobot/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-initdata': initData },
      body: JSON.stringify({ tariff_id: t.id }),
    });
    const data = await res.json();
    if (data.pay_url) {
      window.open(data.pay_url, '_blank');
      showToast('Открываем окно оплаты...', 'success');
    } else {
      showToast(data.error || 'Ошибка оплаты', 'error');
    }
  };

  return (
    <div className="page">
      <h2 className="page-title">👑 ТАРИФЫ</h2>
      <div className="tariffs-grid">
        {tariffs.map((t, i) => (
          <div key={t.id} className={`tariff-card tier-${i}`}>
            <div className="tariff-hex">{i + 1}</div>
            <div className="tariff-body">
              <div className="tariff-name">{t.name.toUpperCase()}</div>
              <div className="tariff-desc">
                {t.paid_reels_daily} рилсов · мин. вывод {t.min_withdrawal_usdt || '—'} USDT
              </div>
            </div>
            <div className="tariff-price">${t.price_usdt}</div>
            <button
              className={t.price_usdt === 0 ? 'current' : 'buy'}
              onClick={() => t.price_usdt === 0 ? showToast('Это ваш текущий тариф') : buy(t)}>
              {t.price_usdt === 0 ? 'Текущий' : 'Купить'}
            </button>
          </div>
        ))}
      </div>
      <div className="tariff-note">Все тарифы действуют 30 дней</div>
    </div>
  );
}