import { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import WalletPage from './pages/WalletPage';
import ReferralPage from './pages/ReferralPage';
import TariffsPage from './pages/TariffsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import Toast from './components/Toast';

const API = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const { initData } = useTelegram();
  const [tab, setTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'info' });

  const showToast = (msg, type = 'info') => setToast({ msg, type });

  const loadProfile = () => {
    if (!initData) return;
    fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'x-telegram-initdata': initData },
    }).then(r => r.json()).then(setProfile).catch(console.error);
  };

  useEffect(() => {
    if (!initData) return;
    loadProfile();
    fetch(`${API}/users/tariffs`).then(r => r.json()).then(setTariffs).catch(() => {});
    fetch(`${API}/admin/reels`, { headers: { 'x-telegram-initdata': initData } })
      .then(r => { if (r.ok) setIsAdmin(true); }).catch(() => {});
  }, [initData]);

  if (!initData) return <div className="loading">Загрузка...</div>;

  const go = (t) => {
    setTab(t);
    setSideOpen(false);
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  const render = () => {
    switch (tab) {
      case 'home': return <HomePage profile={profile} onNavigate={go} tariffs={tariffs} showToast={showToast} />;
      case 'tasks': return <TasksPage initData={initData} showToast={showToast} onRefresh={loadProfile} />;
      case 'wallet': return <WalletPage initData={initData} showToast={showToast} onRefresh={loadProfile} />;
      case 'referrals': return <ReferralPage initData={initData} showToast={showToast} />;
      case 'tariffs': return <TariffsPage tariffs={tariffs} initData={initData} showToast={showToast} />;
      case 'profile': return <ProfilePage profile={profile} isAdmin={isAdmin} onOpenAdmin={() => go('admin')} showToast={showToast} />;
      case 'admin': return <AdminPage initData={initData} showToast={showToast} />;
      default: return <HomePage profile={profile} onNavigate={go} tariffs={tariffs} showToast={showToast} />;
    }
  };

  return (
    <div className="app">
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'info' })} />

      {tab === 'home' && profile && (
        <>
          <div className="top-panel">
            <div className="profile-badge">
              <div className="avatar">{profile.user.first_name?.[0] || 'P'}</div>
              <div className="profile-info">
                <div className="name">{profile.user.first_name} {profile.user.last_name}</div>
                <div className="id">ID: {profile.user.telegram_id}</div>
              </div>
            </div>
            <div className="balance-badges">
              <div className="badge usdt" onClick={() => showToast(`Баланс: ${profile.wallet.usdt_balance} USDT`, 'success')}>
                <span className="icon">💵</span>
                <div>
                  <div className="amount">{profile.wallet.usdt_balance}</div>
                  <div className="label">USDT</div>
                </div>
              </div>
              <div className="badge coin" onClick={() => showToast(`Монеты: ${profile.wallet.coin_balance}`, 'success')}>
                <span className="icon">🪙</span>
                <div>
                  <div className="amount">{profile.wallet.coin_balance}</div>
                  <div className="label">Монеты</div>
                </div>
              </div>
            </div>
          </div>

          <button className="menu-toggle" onClick={() => { setSideOpen(true); showToast('Меню открыто'); }}>☰</button>
        </>
      )}

      {sideOpen && (
        <div className="side-overlay" onClick={() => setSideOpen(false)}>
          <div className="side-menu" onClick={e => e.stopPropagation()}>
            <div className="side-menu-title">МЕНЮ</div>
            <button onClick={() => go('profile')}>👤 Профиль</button>
            <button onClick={() => go('tariffs')}>👑 Тарифы</button>
            <button onClick={() => { window.open('https://t.me/orbitreels_info', '_blank'); showToast('Открываем поддержку...'); }}>🎧 Поддержка</button>
            <button onClick={() => { window.open('https://t.me/orbitreels_info', '_blank'); showToast('Открываем канал новостей...'); }}>📰 Новости</button>
            {isAdmin && <button onClick={() => go('admin')}>⚙️ Админ</button>}
          </div>
        </div>
      )}

      <div className="page-content">{render()}</div>

      <nav className="bottom-nav">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => go('home')}>
          <span>🏠</span>Главная
        </button>
        <button className={tab === 'tasks' ? 'active' : ''} onClick={() => go('tasks')}>
          <span>📋</span>Задания
        </button>
        <button className={tab === 'wallet' ? 'active' : ''} onClick={() => go('wallet')}>
          <span>👛</span>Кошелёк
        </button>
        <button className={tab === 'referrals' ? 'active' : ''} onClick={() => go('referrals')}>
          <span>👥</span>Рефералы
        </button>
      </nav>
    </div>
  );
}