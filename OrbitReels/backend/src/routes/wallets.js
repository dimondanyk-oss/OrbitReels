export default async function walletRoutes(app) {
  app.get('/balance', { preHandler: app.authenticate }, async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT id,is_verified FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      if (!u) return reply.code(404).send({ error: 'Not found' });
      const w = (await c.query('SELECT usdt_balance,coin_balance FROM wallets WHERE user_id=$1', [u.id])).rows[0];
      const p = await c.query(`SELECT t.min_withdrawal_usdt FROM user_plans up
        JOIN tariffs t ON up.tariff_id=t.id WHERE up.user_id=$1 ORDER BY up.id DESC LIMIT 1`, [u.id]);
      return reply.send({
        usdt_balance: w.usdt_balance,
        coin_balance: w.coin_balance,
        min_withdrawal_usdt: p.rows[0]?.min_withdrawal_usdt || null,
        is_verified: u.is_verified,
      });
    } finally { c.release(); }
  });

  app.post('/verify', { preHandler: app.authenticate }, async (req, reply) => {
    const { captchaToken } = req.body;
    const c = await app.pg.connect();
    try {
      const { checkTelegramSubscription } = await import('../services/telegram.js');
      const u = (await c.query('SELECT id,is_verified FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      if (!u) return reply.code(404).send({ error: 'Not found' });
      if (u.is_verified) return reply.code(400).send({ error: 'Already verified' });
      const ok = await checkTelegramSubscription(req.user.telegram_id, app.config.infoChannelUsername);
      if (!ok) return reply.code(400).send({ error: 'Subscribe first' });
      if (app.config.turnstileSecret && captchaToken) {
        const cr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: app.config.turnstileSecret, response: captchaToken }),
        }).then(r => r.json());
        if (!cr.success) return reply.code(400).send({ error: 'Captcha failed' });
      }
      const fee = 0.28;
      const w = (await c.query('SELECT usdt_balance FROM wallets WHERE user_id=$1', [u.id])).rows[0];
      if (parseFloat(w.usdt_balance) < fee)
        return reply.code(400).send({ error: `Need ${fee} USDT` });
      await c.query('BEGIN');
      await c.query('UPDATE wallets SET usdt_balance=usdt_balance-$1 WHERE user_id=$2', [fee, u.id]);
      await c.query('UPDATE users SET is_verified=true WHERE id=$1', [u.id]);
      await c.query('COMMIT');
      return reply.send({ success: true });
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally { c.release(); }
  });

  app.post('/withdraw', { preHandler: app.authenticate }, async (req, reply) => {
    const { amount_usdt, wallet_address } = req.body;
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT id,is_verified FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      if (!u.is_verified) return reply.code(403).send({ error: 'Verify first' });
      const p = (await c.query(`SELECT t.min_withdrawal_usdt FROM user_plans up
        JOIN tariffs t ON up.tariff_id=t.id WHERE up.user_id=$1
        ORDER BY up.id DESC LIMIT 1`, [u.id])).rows[0];
      if (!p?.min_withdrawal_usdt) return reply.code(403).send({ error: 'Withdrawal disabled' });
      if (!amount_usdt || amount_usdt < p.min_withdrawal_usdt)
        return reply.code(400).send({ error: `Min ${p.min_withdrawal_usdt} USDT` });
      if (!wallet_address || wallet_address.length < 10)
        return reply.code(400).send({ error: 'Bad address' });
      const w = (await c.query('SELECT usdt_balance FROM wallets WHERE user_id=$1', [u.id])).rows[0];
      if (parseFloat(w.usdt_balance) < amount_usdt)
        return reply.code(400).send({ error: 'Insufficient' });
      const ins = await c.query(`INSERT INTO withdrawals (user_id,amount_usdt,wallet_address)
        VALUES ($1,$2,$3) RETURNING id`, [u.id, amount_usdt, wallet_address]);
      return reply.send({ success: true, withdrawal_id: ins.rows[0].id });
    } finally { c.release(); }
  });

  app.get('/withdrawals', { preHandler: app.authenticate }, async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT id FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      const r = await c.query(`SELECT id,amount_usdt,wallet_address,status,created_at,tx_hash
        FROM withdrawals WHERE user_id=$1 ORDER BY created_at DESC`, [u.id]);
      return reply.send(r.rows);
    } finally { c.release(); }
  });
}