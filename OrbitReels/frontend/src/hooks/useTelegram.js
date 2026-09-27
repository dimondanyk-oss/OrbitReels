import { useEffect, useState } from 'react';

export function useTelegram() {
  const [user, setUser] = useState(null);
  const [initData, setInitData] = useState(null);

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (wa) {
      wa.ready();
      wa.expand();
      setUser(wa.initDataUnsafe?.user);
      setInitData(wa.initData);
    }
  }, []);

  return { user, initData };
}