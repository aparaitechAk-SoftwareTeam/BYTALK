export const MESSAGE_RETENTION_MS = 24 * 60 * 60 * 1000;

export function messageCutoff(now = Date.now()) {
  return new Date(now - MESSAGE_RETENTION_MS);
}

export function isMessageRetained(message, now = Date.now()) {
  const createdAt = new Date(message.createdAt || message.at);
  return !Number.isNaN(createdAt.getTime()) && createdAt >= messageCutoff(now);
}
