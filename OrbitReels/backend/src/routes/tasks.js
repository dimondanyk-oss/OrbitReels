export default async function taskRoutes(app) {
  app.get('/reels', { preHandler: app.authenticate }, async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const r = await c.query(`SELECT id,title,platform,embed_code,duration_required,
        reward_usdt,reward_coin FROM content_reels WHERE is_active=true`);
      return reply.send(r.rows);
    } finally { c.release(); }
  });

  app.post('/reels/:id/start', { preHandler: app.authenticate }, async (req, reply) => {
    const reelId = parseInt(req.params.id);
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT id FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      if (!u) return reply.code(404).send({ error: 'Not found' });
      const p = await c.query(`SELECT up.*,t.paid_reels_daily FROM user_plans up
        JOIN tariffs t ON up.tariff_id=t.id WHERE up.user_id=$1 ORDER BY up.id DESC LIMIT 1`, [u.id]);
      if (p.rows.length === 0) return reply.code(400).send({ error: 'No plan' });
      const today = new Date().toISOString().slice(0, 10);
      if (p.rows[0].last_reset_date !== today) {
        await c.query(`UPDATE user_plans SET paid_reels_used_today=0,
          ads_used_today=0, subs_used_today=0, last_reset_date=$1 WHERE user_id=$2`, [today, u.id]);
      }
      const pd = p.rows[0];
      let ru = 0, rc = 0;
      if (pd.paid_reels_used_today < pd.paid_reels_daily) {
        const r = await c.query('SELECT reward_usdt,reward_coin FROM content_reels WHERE id=$1', [reelId]);
        ru = r.rows[0].reward_usdt;
        rc = r.rows[0].reward_coin;
      } else {
        const r = await c.query('SELECT reward_coin FROM content_reels WHERE id=$1', [reelId]);
        rc = r.rows[0].reward_coin;
      }
      const s = await c.query(`INSERT INTO watch_sessions (user_id,reel_id,status,reward_usdt,reward_coin)
        VALUES ($1,$2,'started',$3,$4) RETURNING session_token`, [u.id, reelId, ru, rc]);
      return reply.send({ session_token: s.rows[0].session_token, paid: ru > 0 });
    } finally { c.release(); }
  });

  app.post('/reels/:id/complete', { preHandler: app.authenticate }, async (req, reply) => {
    const reelId = parseInt(req.params.id);
    const { session_token, client_duration } = req.body;
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT id FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      const s = await c.query(`SELECT * FROM watch_sessions
        WHERE session_token=$1 AND user_id=$2 AND status='started'`, [session_token, u.id]);
      if (s.rows.length === 0) return reply.code(400).send({ error: 'Bad session' });
      const r = await c.query('SELECT duration_required FROM content_reels WHERE id=$1', [reelId]);
      if (client_duration < r.rows[0].duration_required) {
        await c.query(`UPDATE watch_sessions SET status='failed' WHERE id=$1`, [s.rows[0].id]);
        return reply.code(400).send({ error: 'Watch longer' });
      }
      const ru = s.rows[0].reward_usdt || 0;
      const rc = s.rows[0].reward_coin || 0;
      await c.query('BEGIN');
      await c.query(`UPDATE watch_sessions SET status='completed', ended_at=NOW(),
        client_duration=$1 WHERE id=$2`, [client_duration, s.rows[0].id]);
      await c.query(`UPDATE wallets SET usdt_balance=usdt_balance+$1,
        coin_balance=coin_balance+$2, total_usdt_earned=total_usdt_earned+$1,
        total_coin_earned=total_coin_earned+$2 WHERE user_id=$3`, [ru, rc, u.id]);
      if (ru > 0) await c.query(`UPDATE user_plans SET paid_reels_used_today=paid_reels_used_today+1
        WHERE user_id=$1`, [u.id]);
      await c.query('COMMIT');
      return reply.send({ success: true, reward_usdt: ru, reward_coin: rc });
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally { c.release(); }
  });

  app.get('/ads', { preHandler: app.authenticate }, async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const r = await c.query(`SELECT id,title,embed_url,redirect_url,duration_required,
        reward_usdt,reward_coin FROM ads WHERE is_active=true`);
      return reply.send(r.rows);
    } finally { c.release(); }
  });

  app.post('/ads/:id/complete', { preHandler: app.authenticate }, async (req, reply) => {
    const id = parseInt(req.params.id);
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT id FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      const a = await c.query('SELECT reward_usdt,reward_coin FROM ads WHERE id=$1', [id]);
      if (a.rows.length === 0) return reply.code(404).send({ error: 'Not found' });
      const { reward_usdt, reward_coin } = a.rows[0];
      await c.query('BEGIN');
      await c.query(`UPDATE wallets SET usdt_balance=usdt_balance+$1,
        coin_balance=coin_balance+$2 WHERE user_id=$3`, [reward_usdt, reward_coin, u.id]);
      await c.query('COMMIT');
      return reply.send({ success: true, reward_usdt, reward_coin });
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally { c.release(); }
  });

  app.get('/channels', { preHandler: app.authenticate }, async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const r = await c.query(`SELECT id,channel_username,reward_usdt,reward_coin
        FROM subscription_channels WHERE is_active=true`);
      return reply.send(r.rows);
    } finally { c.release(); }
  });

  app.post('/channels/:id/verify', { preHandler: app.authenticate }, async (req, reply) => {
    const id = parseInt(req.params.id);
    const c = await app.pg.connect();
    try {
      const { checkTelegramSubscription } = await import('../services/telegram.js');
      const u = (await c.query('SELECT id FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      const ch = await c.query('SELECT * FROM subscription_channels WHERE id=$1 AND is_active=true', [id]);
      if (ch.rows.length === 0) return reply.code(404).send({ error: 'Not found' });
      const ex = await c.query(`SELECT 1 FROM user_subscriptions
        WHERE user_id=$1 AND channel_id=$2 AND status='verified'`, [u.id, id]);
      if (ex.rows.length > 0) return reply.code(400).send({ error: 'Already verified' });
      const ok = await checkTelegramSubscription(req.user.telegram_id, ch.rows[0].channel_username);
      if (!ok) return reply.code(400).send({ error: 'Not subscribed' });
      const { reward_usdt, reward_coin } = ch.rows[0];
      await c.query('BEGIN');
      await c.query(`INSERT INTO user_subscriptions (user_id,channel_id,status,verified_at)
        VALUES ($1,$2,'verified',NOW()) ON CONFLICT (user_id,channel_id)
        DO UPDATE SET status='verified', verified_at=NOW()`, [u.id, id]);
      await c.query(`UPDATE wallets SET usdt_balance=usdt_balance+$1,
        coin_balance=coin_balance+$2 WHERE user_id=$3`, [reward_usdt, reward_coin, u.id]);
      await c.query('COMMIT');
      return reply.send({ success: true, reward_usdt, reward_coin });
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally { c.release(); }
  });
}