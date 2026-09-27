export default function ProfilePage({ profile, isAdmin, onOpenAdmin, showToast }) {
  if (!profile) return <div className="page"><p>Загрузка...</p></div>;
  return (
    <div className="page">
      <h2 className="page-title">👤 ПРОФИЛЬ</h2>
      <div className="card">
        <h4>{profile.user.first_name} {profile.user.last_name}</h4>
        <p>@{profile.user.username || '—'}</p>
        <p>ID: {profile.user.telegram_id}</p>
      </div>
      <div className="card">
        <h4>👑 Тариф: {profile.plan?.name}</h4>
        <p>Рилсов/день: {profile.plan?.paid_reels_daily}</p>
        <p>Реклама/день: {profile.plan?.ad_limit_daily}</p>
        <p>Подписки/день: {profile.plan?.sub_limit_daily}</p>
        <p>Мин. вывод: {profile.plan?.min_withdrawal_usdt ?? 'недоступен'}</p>
      </div>
      {isAdmin && (
        <div className="card">
          <button onClick={() => { showToast('Открываем админ-панель...'); onOpenAdmin(); }}>⚙️ Админ-панель</button>
        </div>
      )}
    </div>
  );
}