function ytId(u){const m=u.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);return m&&m[2].length===11?m[2]:null;}
function igId(u){const m=u.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);return m?m[1]:null;}
function ttId(u){const m=u.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);return m?m[1]:null;}

export default async function adminRoutes(app) {
  app.addHook('preHandler', async (req, reply) => {
    const initData = req.headers['x-telegram-initdata'];
    if (!initData) return reply.code(401).send({ error: 'No initData' });
    const { verifyTelegramWebAppData } = await import('../utils/telegramAuth.js');
    try { req.user = verifyTelegramWebAppData(initData, app.config.botToken); }
    catch { return reply.code(401).send({ error: 'Bad initData' }); }
    if (!app.config.adminTelegramIds.includes(req.user.telegram_id))
      return reply.code(403).send({ error: 'Forbidden' });
  });

  app.get('/reels', async (req, reply) => {
    const c = await app.pg.connect();
    try { return reply.send((await c.query('SELECT * FROM content_reels ORDER BY created_at DESC')).rows); }
    finally { c.release(); }
  });

  app.post('/reels', async (req, reply) => {
    const { title, platform, url, duration_required, reward_usdt, reward_coin } = req.body;
    if (!['youtube', 'instagram', 'tiktok'].includes(platform))
      return reply.code(400).send({ error: 'Bad platform' });
    let embed = '';
    if (platform === 'youtube') {
      const id = ytId(url);
      if (!id) return reply.code(400).send({ error: 'Bad YouTube URL' });
      embed = `https://www.youtube.com/embed/${id}?enablejsapi=1&controls=0&rel=0&modestbranding=1&playsinline=1`;
    } else if (platform === 'instagram') {
      const sc = igId(url);
      if (!sc) return reply.code(400).send({ error: 'Bad Instagram URL' });
      embed = `https://www.instagram.com/reel/${sc}/embed/`;
    } else {
      const id = ttId(url);
      if (!id) return reply.code(400).send({ error: 'Bad TikTok URL' });
      embed = `https://www.tiktok.com/embed/v2/${id}`;
    }
    const c = await app.pg.connect();
    try {
      const r = await c.query(`INSERT INTO content_reels
        (title,platform,url,embed_code,duration_required,reward_usdt,reward_coin)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [title, platform, url, embed, duration_required || 10, reward_usdt || 0.01, reward_coin || 1]);
      return reply.send(r.rows[0]);
    } finally { c.release(); }
  });

  app.delete('/reels/:id', async (req, reply) => {
    const c = await app.pg.connect();
    try { await c.query('UPDATE content_reels SET is_active=false WHERE id=$1', [req.params.id]); return reply.send({ success: true }); }
    finally { c.release(); }
  });

  app.get('/channels', async (req, reply) => {
    const c = await app.pg.connect();
    try { return reply.send((await c.query('SELECT * FROM subscription_channels ORDER BY id DESC')).rows); }
    finally { c.release(); }
  });

  app.post('/channels', async (req, reply) => {
    const { channel_username, reward_usdt, reward_coin } = req.body;
    const c = await app.pg.connect();
    try {
      const r = await c.query(`INSERT INTO subscription_channels
        (channel_username,reward_usdt,reward_coin) VALUES ($1,$2,$3) RETURNING *`,
        [channel_username, reward_usdt || 0.05, reward_coin || 5]);
      return reply.send(r.rows[0]);
    } finally { c.release(); }
  });

  app.delete('/channels/:id', async (req, reply) => {
    const c = await app.pg.connect();
    try { await c.query('UPDATE subscription_channels SET is_active=false WHERE id=$1', [req.params.id]); return reply.send({ success: true }); }
    finally { c.release(); }
  });

  app.get('/withdrawals', async (req, reply) => {
    const c = await app.pg.connect();
    try {
      const r = await c.query(`SELECT w.*,u.telegram_id,u.username FROM withdrawals w
        JOIN users u ON w.user_id=u.id WHERE w.status='pending' ORDER BY w.created_at`);
      return reply.send(r.rows);
    } finally { c.release(); }
  });

  app.post('/withdrawals/:id/approve', async (req, reply) => {
    const { tx_hash } = req.body;
    const c = await app.pg.connect();
    try {
      await c.query('BEGIN');
      const w = (await c.query(`SELECT * FROM withdrawals WHERE id=$1 AND status='pending'`, [req.params.id])).rows[0];
      if (!w) { await c.query('ROLLBACK'); return reply.code(404).send({ error: 'Not found' }); }
      await c.query('UPDATE wallets SET usdt_balance=usdt_balance-$1 WHERE user_id=$2', [w.amount_usdt, w.user_id]);
      await c.query(`UPDATE withdrawals SET status='approved', reviewed_at=NOW(), tx_hash=$1 WHERE id=$2`, [tx_hash || '', req.params.id]);
      await c.query('COMMIT');
      return reply.send({ success: true });
    } catch (e) { await c.query('ROLLBACK'); throw e; }
    finally { c.release(); }
  });

  app.post('/withdrawals/:id/reject', async (req, reply) => {
    const c = await app.pg.connect();
    try {
      await c.query(`UPDATE withdrawals SET status='rejected', reviewed_at=NOW() WHERE id=$1 AND status='pending'`, [req.params.id]);
      return reply.send({ success: true });
    } finally { c.release(); }
  });
}