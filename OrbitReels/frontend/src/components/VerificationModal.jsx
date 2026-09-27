import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

export default function VerificationModal({ initData, onVerified }) {
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('idle');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    document.body.appendChild(s);
    s.onload = () => {
      if (window.turnstile) {
        window.turnstile.render('#captcha-box', {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          callback: setToken,
        });
      }
    };
  }, []);

  const verify = async () => {
    setStatus('verifying'); setMsg('');
    const res = await fetch(`${API}/wallets/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-initdata': initData },
      body: JSON.stringify({ captchaToken: token }),
    });
    const d = await res.json();
    if (res.ok) { setStatus('done'); setMsg('Верификация пройдена'); setTimeout(onVerified, 1000); }
    else { setStatus('error'); setMsg(d.error || 'Ошибка'); }
  };

  return (
    <div className="card">
      <h4>🔒 Верификация аккаунта</h4>
      <p className="hint">Для вывода нужно подтвердить, что вы не бот. Комиссия 0.28 USDT списывается один раз.</p>
      <button onClick={() => window.open('https://t.me/orbitreels_info', '_blank')}>Подписаться на канал</button>
      <div id="captcha-box" style={{ margin: '10px 0' }} />
      <button onClick={verify} disabled={!token || status === 'verifying'}>
        {status === 'verifying' ? 'Проверка...' : 'Пройти верификацию'}
      </button>
      {msg && <p className={status === 'done' ? 'success' : 'error'}>{msg}</p>}
    </div>
  );
}