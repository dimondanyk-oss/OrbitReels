export default async function userRoutes(app) {
  app.post('/login', async (req, reply) => {
    const initData = req.headers['x-telegram-initdata'];
    if (!initData) return reply.code(401).send({ error: 'Missing initData' });
    const { verifyTelegramWebAppData } = await import('../utils/telegramAuth.js');
    let ud;
    try { ud = verifyTelegramWebAppData(initData, app.config.botToken); }
    catch { return reply.code(401).send({ error: 'Invalid initData' }); }

    const { telegram_id, username, first_name, last_name, photo_url, start_param } = ud;
    const c = await app.pg.connect();
    try {
      await c.query('BEGIN');
      let u = await c.query('SELECT * FROM users WHERE telegram_id=$1', [telegram_id]);
      let isNew = false;
      if (u.rows.length === 0) {
        u = (await c.query(
          `INSERT INTO users (telegram_id,username,first_name,last_name,photo_url)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [telegram_id, username, first_name, last_name, photo_url]
        )).rows[0];
        isNew = true;
        await c.query('INSERT INTO wallets (user_id) VALUES ($1)', [u.id]);
        await c.query(`INSERT INTO user_plans (user_id,tariff_id)
          VALUES ($1,(SELECT id FROM tariffs WHERE name='Бесплатный'))`, [u.id]);
      } else {
        u = u.rows[0];
        await c.query('UPDATE users SET last_login=NOW() WHERE id=$1', [u.id]);
      }

      if (isNew && start_param && start_param.startsWith('ref_')) {
        const rid = parseInt(start_param.replace('ref_', ''));
        if (!isNaN(rid) && rid !== u.id) {
          const r = await c.query('SELECT id FROM users WHERE id=$1', [rid]);
          if (r.rows.length > 0) {
            await c.query(`INSERT INTO referrals (referrer_id,referred_id,status)
              VALUES ($1,$2,'verified') ON CONFLICT DO NOTHING`, [rid, u.id]);
            await c.query(`UPDATE wallets SET usdt_balance=usdt_balance+0.02,
              coin_balance=coin_balance+3, total_usdt_earned=total_usdt_earned+0.02,
              total_coin_earned=total_coin_earned+3 WHERE user_id=$1`, [rid]);
            const cnt = await c.query(`SELECT COUNT(*) FROM referrals
              WHERE referrer_id=$1 AND status='verified'`, [rid]);
            const total = parseInt(cnt.rows[0].count);
            const tasks = await c.query('SELECT * FROM referral_tasks ORDER BY count_required');
            for (const t of tasks.rows) {
              if (total >= t.count_required) {
                const ex = await c.query(`SELECT 1 FROM user_referral_tasks
                  WHERE user_id=$1 AND task_id=$2`, [rid, t.id]);
                if (ex.rows.length === 0) {
                  await c.query(`UPDATE wallets SET usdt_balance=usdt_balance+$1,
                    coin_balance=coin_balance+$2 WHERE user_id=$3`,
                    [t.reward_usdt, t.reward_coin, rid]);
                  await c.query(`INSERT INTO user_referral_tasks (user_id,task_id)
                    VALUES ($1,$2)`, [rid, t.id]);
                }
              }
            }
          }
        }
      }

      const w = await c.query('SELECT * FROM wallets WHERE user_id=$1', [u.id]);
      const p = await c.query(`SELECT up.*,t.name,t.price_usdt,t.paid_reels_daily,
        t.ad_limit_daily,t.sub_limit_daily,t.min_withdrawal_usdt
        FROM user_plans up JOIN tariffs t ON up.tariff_id=t.id
        WHERE up.user_id=$1 ORDER BY up.id DESC LIMIT 1`, [u.id]);
      await c.query('COMMIT');
      return reply.send({ user: u, wallet: w.rows[0], plan: p.rows[0] });
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally { c.release(); }
  });

  app.get('/profile', { preHandler: app.authenticate }, async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT * FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      if (!u) return reply.code(404).send({ error: 'Not found' });
      const w = await c.query('SELECT * FROM wallets WHERE user_id=$1', [u.id]);
      const p = await c.query(`SELECT up.*,t.name,t.price_usdt,t.paid_reels_daily,
        t.ad_limit_daily,t.sub_limit_daily,t.min_withdrawal_usdt
        FROM user_plans up JOIN tariffs t ON up.tariff_id=t.id
        WHERE up.user_id=$1 ORDER BY up.id DESC LIMIT 1`, [u.id]);
      return reply.send({ user: u, wallet: w.rows[0], plan: p.rows[0] });
    } finally { c.release(); }
  });

  app.get('/tariffs', async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const r = await c.query('SELECT * FROM tariffs WHERE is_active=true ORDER BY price_usdt');
      return reply.send(r.rows);
    } finally { c.release(); }
  });

  app.get('/referrals/stats', { preHandler: app.authenticate }, async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const u = (await c.query('SELECT id FROM users WHERE telegram_id=$1', [req.user.telegram_id])).rows[0];
      if (!u) return reply.code(404).send({ error: 'Not found' });
      const cnt = await c.query(`SELECT COUNT(*) FROM referrals
        WHERE referrer_id=$1 AND status='verified'`, [u.id]);
      const tasks = await c.query('SELECT * FROM referral_tasks ORDER BY count_required');
      const done = await c.query('SELECT task_id FROM user_referral_tasks WHERE user_id=$1', [u.id]);
      const s = new Set(done.rows.map(r => r.task_id));
      return reply.send({
        referralLink: `https://t.me/OrbitReelsBot?startapp=ref_${u.id}`,
        totalFriends: parseInt(cnt.rows[0].count),
        tasks: tasks.rows.map(t => ({ ...t, completed: s.has(t.id) })),
      });
    } finally { c.release(); }
  });
}