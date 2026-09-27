export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  botToken: process.env.BOT_TOKEN,
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',').map(id => parseInt(id.trim())).filter(Boolean),
  cryptobotToken: process.env.CRYPTOBOT_API_TOKEN,
  cryptobotSecret: process.env.CRYPTOBOT_WEBHOOK_SECRET,
  infoChannelUsername: process.env.INFO_CHANNEL_USERNAME,
  turnstileSecret: process.env.TURNSTILE_SECRET,
};