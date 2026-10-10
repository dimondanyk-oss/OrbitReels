import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import fastifyRedis from '@fastify/redis';
import fastifyCors from '@fastify/cors';
import { config } from './config/index.js';
import { initDatabase } from './utils/initDatabase.js';
import { verifyTelegramWebAppData } from './utils/telegramAuth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import walletRoutes from './routes/wallets.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';

const app = Fastify({ logger: true });
app.decorate('config', config);

await app.register(fastifyCors, { origin: true });
await app.register(fastifyPostgres, { connectionString: config.databaseUrl });
await app.register(fastifyRedis, { url: config redisUrl, connectTimeout: 10000 });

app.decorate('authenticate', async (req, reply) => {
  const initData = req.headers['x-telegram-initdata'];
  if (!initData) return reply.code(401).send({ error: 'No initData' });
  try { req.user = verifyTelegramWebAppData(initData, config.botToken); }
  catch { return reply.code(401).send({ error: 'Bad initData' }); }
});

await initDatabase(app.pg);

app.register(userRoutes, { prefix: '/api/users' });
app.register(taskRoutes, { prefix: '/api/tasks' });
app.register(walletRoutes, { prefix: '/api/wallets' });
app.register(adminRoutes, { prefix: '/api/admin' });
app.register(paymentRoutes, { prefix: '/api/payments' });

app.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
});