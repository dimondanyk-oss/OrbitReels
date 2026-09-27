import crypto from 'crypto';

export default async function paymentRoutes(app) {
  app.post('/cryptobot/create-invoice', { preHandler: app.authenticate }, async (req, reply) => {
    const { tariff_id } = req.body;
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT id FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      const t = (await c.query('SELECT * FROM tariffs WHERE id=$1', [tariff_id])).rows[0];
      if (!t) return reply.code(400).send({ error: 'Bad tariff' });
      const payload = JSON.stringify({ user_id: u.id, tariff_id: t.id });
      const r = await fetch('https://pay.crypt.bot/api/createInvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Crypto-Pay-API-Token': app.config.cryptobotToken },
        body: JSON.stringify({
          asset: 'USDT',
          amount: t.price_usdt.toString(),
          description: `Тариф ${t.name} — OrbitReels`,
          payload,
          allow_anonymous: false,
          expires_in: 3600,
        }),
      });
      const data = await r.json();
      if (!data.ok) return reply.code(500).send({ error: 'Crypto Bot error' });
      await c.query(`INSERT INTO payments (user_id,tariff_id,amount_usdt,currency,status,external_id)
        VALUES ($1,$2,$3,'USDT','pending',$4)`,
        [u.id, t.id, t.price_usdt, data.result.invoice_id.toString()]);
      return reply.send({ pay_url: data.result.pay_url });
    } finally { c.release(); }
  });

  app.post('/cryptobot/webhook', async (req, reply) => {
    const sig = req.headers['crypto-pay-api-signature'];
    if (!sig) return reply.code(401).send({ error: 'No sig' });
    const raw = JSON.stringify(req.body);
    const exp = crypto.createHmac('sha256', app.config.cryptobotSecret).update(raw).digest('hex');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp)))
        return reply.code(401).send({ error: 'Bad sig' });
    } catch { return reply.code(401).send({ error: 'Bad sig' }); }

    const u = req.body;
    if (u.update_type === 'invoice_paid' && u.payload.status === 'paid') {
      const pl = JSON.parse(u.payload.payload);
      const c = await app.pg.connect();
      try {
        await c.query('BEGIN');
        const pay = (await c.query(`SELECT * FROM payments WHERE external_id=$1 AND status='pending'`,
          [u.payload.invoice_id.toString()])).rows[0];
        if (!pay) { await c.query('ROLLBACK'); return reply.send({ ok: true }); }
        await c.query(`UPDATE user_plans SET plan_expires_at=NOW()
          WHERE user_id=$1 AND plan_expires_at IS NULL`, [pl.user_id]);
        await c.query(`INSERT INTO user_plans (user_id,tariff_id,plan_started_at,plan_expires_at)
          VALUES ($1,$2,NOW(),NOW()+INTERVAL '30 days')`, [pl.user_id, pl.tariff_id]);
        await c.query(`UPDATE payments SET status='completed', completed_at=NOW() WHERE id=$1`, [pay.id]);
        await c.query('COMMIT');
        fetch(`https://api.telegram.org/bot${app.config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: pl.user_id, text: '✅ Тариф активирован!' }),
        }).catch(() => {});
      } catch (e) { await c.query('ROLLBACK'); throw e; }
      finally { c.release(); }
    }
    return reply.send({ ok: true });
  });
}