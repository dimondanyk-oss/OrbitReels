export async function checkTelegramSubscription(userId, channelUsername) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelUsername, user_id: userId }),
    });
    const data = await res.json();
    return data.ok && ['member', 'administrator', 'creator'].includes(data.result?.status);
  } catch {
    return false;
  }
}