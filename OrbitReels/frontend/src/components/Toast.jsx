import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  const colors = {
    info: { bg: 'rgba(30,120,220,.95)', border: '#4da6ff' },
    success: { bg: 'rgba(34,197,94,.95)', border: '#22c55e' },
    error: { bg: 'rgba(220,50,50,.95)', border: '#ff6b6b' },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '12px 20px', color: '#fff',
      fontSize: 13, fontWeight: 600, zIndex: 9999,
      boxShadow: '0 8px 30px rgba(0,0,0,.5)',
      backdropFilter: 'blur(10px)',
      animation: 'slideDown .3s ease',
      maxWidth: '90%', textAlign: 'center',
    }}>
      {message}
    </div>
  );
}