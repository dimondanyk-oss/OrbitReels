import { useState, useEffect } from 'react';
import VerificationModal from '../components/VerificationModal';

const API = import.meta.env.VITE_API_URL || '/api';

export default function WalletPage({ initData, showToast, onRefresh }) {
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');

  const load = () => {
    fetch(`${API}/wallets/balance`, { headers: { 'x-telegram-initdata': initData } })
      .then(r => r.json()).then(setWallet).catch(console.error);
    fetch(`${API}/wallets/withdrawals`, { headers: { 'x-telegram-initdata': initData } })
      .then(r => r.json()).then(setWithdrawals).catch(console.error);
  };

  useEffect(() => { if (initData) load(); }, [initData]);

  const balance = parseFloat(wallet?.usdt_balance || 0);
  const minW = wallet?.min_withdrawal_usdt ? parseFloat(wallet.min_withdrawal_usdt) : null;
  const canWithdraw = minW !== null && balance >= minW;

  const doWithdraw = async () => {
    if (!amount || !address) { showToast('Заполните все поля', 'error'); return; }
    const res = await fetch(`${API}/wallets/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-telegram-initdata': initData },
      body: JSON.stringify({ amount_usdt: parseFloat(amount), wallet_address: address }),
    });
    const d = await res.json();
    if (res.ok) {
      showToast('✅ Заявка на вывод создана!', 'success');
      setAmount(''); setAddress('');
      load(); if (onRefresh) onRefresh();
    } else showToast(d.error || 'Ошибка', 'error');
  };

  if (!wallet) return <div className="page"><p>Загрузка...</p></div>;

  return (
    <div className="page">
      <h2 className="page-title">👛 КОШЕЛЁК</h2>

      <div className="wallet-balance">
        ${balance.toFixed(2)} USDT
        <small>🪙 {wallet.coin_balance} COIN</small>
      </div>

      {!canWithdraw && (
        <p className="hint">
          💡 Продолжайте зарабатывать — вывод откроется при достижении порога вашего тарифа.
        </p>
      )}

      {canWithdraw && !wallet.is_verified && (
        <VerificationModal initData={initData}
          onVerified={() => { load(); showToast('✅ Верификация пройдена!', 'success'); }} />
      )}

      {canWithdraw && wallet.is_verified && (
        <div className="card">
          <h4>💸 Вывод USDT</h4>
          <input type="number" placeholder="Сумма USDT" value={amount} onChange={e => setAmount(e.target.value)} />
          <input type="text" placeholder="Адрес TRC-20" value={address} onChange={e => setAddress(e.target.value)} />
          <button onClick={doWithdraw}>Вывести</button>
        </div>
      )}

      <h3 className="section-title" style={{ marginTop: 20 }}>ИСТОРИЯ ВЫВОДОВ</h3>
      {withdrawals.length === 0 && <p className="hint">Пока нет выводов.</p>}
      {withdrawals.map(w => (
        <div key={w.id} className="card">
          <p><b>{w.amount_usdt} USDT</b> — <span style={{
            color: w.status === 'approved' ? '#4ade80' : w.status === 'rejected' ? '#ff6b6b' : '#fbbf24'
          }}>{w.status}</span></p>
          <p style={{ fontSize: 11 }}>{new Date(w.created_at).toLocaleString('ru-RU')}</p>
        </div>
      ))}
    </div>
  );
}