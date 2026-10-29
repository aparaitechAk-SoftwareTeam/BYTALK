import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User, publicUser } from './models/User.js';
import { Message, publicMessage } from './models/Message.js';
import { messageCutoff } from './messageRetention.js';
import { SubscriptionEvent } from './models/SubscriptionEvent.js';
import { SUBSCRIPTION_PLANS, activeSubscription, canUseVideo, entitlementPayload, resetUsageIfNeeded } from './subscriptions.js';
import { AccessToken } from 'livekit-server-sdk';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = process.env.BYTALK_DATA_FILE
  ? path.resolve(process.env.BYTALK_DATA_FILE)
  : path.join(root, 'data', 'store.json');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

// Environment configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production.');
}
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is unset; sessions will be invalidated when the server restarts.');
}
const FIFTEEN_DAYS_SECONDS = 15 * 24 * 60 * 60; // 15 days in seconds
const TURN_URLS = (process.env.TURN_URLS || '').split(',').map((url) => url.trim()).filter(Boolean);
const TURN_SHARED_SECRET = process.env.TURN_SHARED_SECRET || '';
if (TURN_URLS.length && !TURN_SHARED_SECRET) {
  throw new Error('TURN_SHARED_SECRET is required when TURN_URLS is configured.');
}
const LIVEKIT_URL = (process.env.LIVEKIT_URL || '').replace(/\/+$/, '');
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_AVAILABLE = Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
if (!LIVEKIT_AVAILABLE) {
  console.warn('LiveKit is not configured; speaking rooms will remain unavailable.');
}
const REVENUECAT_WEBHOOK_AUTH = process.env.REVENUECAT_WEBHOOK_AUTH || '';
const REVENUECAT_PLUS_ENTITLEMENT = process.env.REVENUECAT_PLUS_ENTITLEMENT || 'bytalk_plus';
const REVENUECAT_PRO_ENTITLEMENT = process.env.REVENUECAT_PRO_ENTITLEMENT || 'bytalk_pro';
const TEST_ENTITLEMENTS_ENABLED = process.env.NODE_ENV !== 'production'
  && process.env.BYTALK_ENABLE_TEST_ENTITLEMENTS === 'true';
const PRACTICE_TOPIC_ALIASES = {
  Education: ['Education', 'Studying', 'Study', 'Exams', 'Academic discussions'],
  Travel: ['Travel', 'Destinations', 'Travel experiences'],
  Culture: ['Culture', 'Traditions'],
  'Work & Career': ['Work & Career', 'Work', 'Jobs', 'Career', 'Professional discussions'],
  Hobbies: ['Hobbies', 'Interests'],
  'Movies & Music': ['Movies & Music', 'Movies', 'Music'],
  Technology: ['Technology', 'Programming'],
  'Daily Life': ['Daily Life', 'Everyday life'],
};
const PRACTICE_TOPICS = ['All Topics', ...Object.keys(PRACTICE_TOPIC_ALIASES)];

function practiceInterestQuery(topic) {
  if (topic === 'All Topics') return {};
  return { practiceInterests: { $in: PRACTICE_TOPIC_ALIASES[topic] } };
}

function levelCompatibilityScore(left, right) {
  const levels = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced', 'Proficient'];
  const leftIndex = levels.indexOf(left);
  const rightIndex = levels.indexOf(right);
  if (leftIndex < 0 || rightIndex < 0) return 0;
  return Math.max(0, 3 - Math.abs(leftIndex - rightIndex));
}

function normalizePracticeInterests(value) {
  if (!Array.isArray(value)) return null;
  const allowed = new Set(Object.keys(PRACTICE_TOPIC_ALIASES));
  const cleaned = value.map((interest) => typeof interest === 'string' ? interest.trim() : '');
  if (cleaned.some((interest) => !allowed.has(interest))) return null;
  return [...new Set(cleaned)];
}
async function ensureMessageRetention() {
  await Message.collection.updateMany(
    { createdAt: { $exists: false }, at: { $type: 'date' } },
    [{ $set: { createdAt: '$at' } }]
  );
  const indexes = await Message.collection.listIndexes().toArray();
  const createdAtIndexes = indexes.filter((index) => JSON.stringify(index.key) === JSON.stringify({ createdAt: 1 }));
  for (const index of createdAtIndexes) {
    if (index.name !== 'message_createdAt_ttl' || index.expireAfterSeconds !== 86400) {
      await Message.collection.dropIndex(index.name);
    }
  }
  const refreshedIndexes = await Message.collection.listIndexes().toArray();
  if (!refreshedIndexes.some((index) => index.name === 'message_createdAt_ttl')) {
    await Message.collection.createIndex(
      { createdAt: 1 },
      { name: 'message_createdAt_ttl', expireAfterSeconds: 86400 }
    );
  }
}

// Optional dynamic import of jsonwebtoken and bcryptjs if installed in node_modules
let jwtLib = null;
const hasJwt = fs.existsSync(path.join(root, 'node_modules', 'jsonwebtoken'));
if (hasJwt) {
  try {
    const mod = await import('jsonwebtoken');
    jwtLib = mod.default || mod;
  } catch (e) {
    jwtLib = null;
  }
}

let bcryptLib = null;
const hasBcrypt = fs.existsSync(path.join(root, 'node_modules', 'bcryptjs'));
if (hasBcrypt) {
  try {
    const mod = await import('bcryptjs');
    bcryptLib = mod.default || mod;
  } catch (e) {
    bcryptLib = null;
  }
}

// Password hashing and verification
function hashPassword(password) {
  if (bcryptLib?.hashSync) {
    return bcryptLib.hashSync(password, 10);
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  if (storedHash.startsWith('$2') && bcryptLib?.compareSync) {
    return bcryptLib.compareSync(password, storedHash);
  }
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, originalHash] = parts;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  }
  return false;
}

// JWT Token Signing and Verification (15-day expiry)
function signToken(payload, options = {}) {
  const expiresInOption = options.expiresIn || '15d';
  if (jwtLib?.sign) {
    return jwtLib.sign(payload, JWT_SECRET, { expiresIn: expiresInOption });
  }

  // RFC 7519 compliant standard JWT implementation
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + FIFTEEN_DAYS_SECONDS;
  const fullPayload = { ...payload, iat: now, exp };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const data = `${b64Header}.${b64Payload}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') throw new Error('Token required');
  if (jwtLib?.verify) {
    return jwtLib.verify(token, JWT_SECRET);
  }

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token structure');
  const [b64Header, b64Payload, signature] = parts;
  const data = `${b64Header}.${b64Payload}`;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  if (signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }
  return payload;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, email, _id, ...safe } = user;
  if (_id && !safe.id) safe.id = String(_id);
  return safe;
}

function cacheUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return { ...safe, id: String(user._id || user.id) };
}

const seed = {
  users: [
    {
      id: 'u1',
      name: 'Pavan Nerkar',
      email: 'pavan@bytalk.com',
      passwordHash: hashPassword('password123'),
      country: 'India',
      nativeLanguage: 'Hindi',
      learningLanguage: 'English',
      level: 'Intermediate',
      online: true,
      streak: 12,
      minutes: 150,
      words: 28,
    },
    {
      id: 'u2',
      name: 'Yuki',
      email: 'yuki@bytalk.com',
      passwordHash: hashPassword('password123'),
      country: 'Japan',
      nativeLanguage: 'Japanese',
      learningLanguage: 'English',
      level: 'Intermediate',
      online: true,
    },
    {
      id: 'u3',
      name: 'Lucas',
      email: 'lucas@bytalk.com',
      passwordHash: hashPassword('password123'),
      country: 'Brazil',
      nativeLanguage: 'Portuguese',
      learningLanguage: 'English',
      level: 'Beginner',
      online: true,
    },
    {
      id: 'u4',
      name: 'Minji',
      email: 'minji@bytalk.com',
      passwordHash: hashPassword('password123'),
      country: 'South Korea',
      nativeLanguage: 'Korean',
      learningLanguage: 'English',
      level: 'Intermediate',
      online: true,
    },
    {
      id: 'u5',
      name: 'Carlos',
      email: 'carlos@bytalk.com',
      passwordHash: hashPassword('password123'),
      country: 'Mexico',
      nativeLanguage: 'Spanish',
      learningLanguage: 'English',
      level: 'Intermediate',
      online: true,
    },
    {
      id: 'u6',
      name: 'Aditi',
      email: 'aditi@bytalk.com',
      passwordHash: hashPassword('password123'),
      country: 'India',
      nativeLanguage: 'Hindi',
      learningLanguage: 'English',
      level: 'Beginner',
      online: true,
    },
  ],
  rooms: [
    { id: 'r1', name: 'Everyday English', topic: 'English', level: 'Beginner - Intermediate', listeners: 24, joined: 0 },
    { id: 'r2', name: 'Travel stories', topic: 'Travel', level: 'Intermediate - Advanced', listeners: 18, joined: 0 },
    { id: 'r3', name: 'Movies & culture', topic: 'Culture', level: 'All levels', listeners: 32, joined: 0 },
    { id: 'r4', name: 'Language exchange', topic: 'Study', level: 'Beginner - Intermediate', listeners: 12, joined: 0 },
  ],
  messages: [
    { id: 'm1', from: 'u2', to: 'u1', text: 'Hi Pavan! 👋 How is your day going?', at: new Date().toISOString() },
    { id: 'm2', from: 'u1', to: 'u2', text: 'Hi! My day is good. I am learning English!', at: new Date().toISOString() },
  ],
  vocabulary: [{ id: 'v1', userId: 'u1', word: 'conversation', category: 'Conversation' }],
  reports: [],
};

let store;
try {
  store = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  if (!Array.isArray(store.users)) {
    store.users = seed.users;
  }
  // Ensure existing stored users have email and secure password hashes
  let updated = false;
  for (const u of store.users) {
    if (!u.email) {
      u.email = `${u.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@bytalk.com`;
      updated = true;
    }
    if (!u.passwordHash) {
      u.passwordHash = hashPassword('password123');
      updated = true;
    }
  }
  if (updated) {
    fs.writeFileSync(dbFile, JSON.stringify(store, null, 2));
  }
} catch {
  store = seed;
  fs.writeFileSync(dbFile, JSON.stringify(store, null, 2));
}

if (!Array.isArray(store.messages)) store.messages = [];
if (!Array.isArray(store.calls)) store.calls = [];

const save = () => fs.writeFileSync(dbFile, JSON.stringify(store, null, 2));

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI must be configured in backend/.env.');
}

try {
  await mongoose.connect(mongoUri);
  console.log('MongoDB Atlas connected successfully.');

  const existingUsers = await User.countDocuments();
  if (existingUsers === 0 && Array.isArray(store.users)) {
    const legacyUsers = store.users
      .filter((user) => user.passwordHash?.startsWith('$2'))
      .map((user) => ({
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        country: user.country,
        nativeLanguage: user.nativeLanguage,
        learningLanguage: user.learningLanguage,
        level: user.level,
        streak: user.streak,
        minutes: user.minutes,
        words: user.words,
      }));
    if (legacyUsers.length) {
      await User.insertMany(legacyUsers, { ordered: false });
      console.log(`Migrated ${legacyUsers.length} bcrypt user(s) from the local store.`);
    }
  }
  store.users = (await User.find().lean()).map(cacheUser);
  await ensureMessageRetention();
  if (await Message.countDocuments() === 0 && store.messages.length) {
    await Message.insertMany(store.messages.map((message) => ({
      id: message.id,
      from: message.from,
      to: message.to,
      text: message.text,
      at: message.at,
      createdAt: message.createdAt || message.at,
      deliveredAt: message.deliveredAt || null,
      readAt: message.readAt || null,
    })), { ordered: false });
    console.log(`Migrated ${store.messages.length} local message(s) to MongoDB.`);
  }
} catch (error) {
  console.error(`MongoDB connection failed: ${error.message}`);
  process.exitCode = 1;
  throw error;
}

const app = express();
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.post('/api/webhooks/revenuecat', express.raw({ type: 'application/json', limit: '128kb' }), async (req, res) => {
  const authorization = req.headers.authorization || '';
  if (!REVENUECAT_WEBHOOK_AUTH || authorization !== `Bearer ${REVENUECAT_WEBHOOK_AUTH}`) {
    return res.status(401).json({ error: 'Invalid webhook authorization' });
  }
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }
  const event = payload?.event;
  const eventId = event?.id;
  const appUserId = String(event?.app_user_id || '');
  if (!eventId || !appUserId) return res.status(400).json({ error: 'Webhook event is incomplete' });
  const user = await User.findById(appUserId);
  if (!user) return res.status(404).json({ error: 'Subscription account not found' });
  try {
    await SubscriptionEvent.create({ eventId, provider: 'revenuecat' });
  } catch (error) {
    if (error?.code === 11000) return res.json({ ok: true, duplicate: true });
    console.error(`RevenueCat event persistence failed: ${error.message}`);
    return res.status(500).json({ error: 'Webhook could not be recorded' });
  }
  const entitlementIds = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids
    : Object.keys(event.entitlement_ids || {});
  const entitlementId = entitlementIds[0] || '';
  const plan = entitlementId === REVENUECAT_PRO_ENTITLEMENT
    ? 'pro'
    : entitlementId === REVENUECAT_PLUS_ENTITLEMENT ? 'plus' : 'free';
  const expiresAt = event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)) : null;
  const type = String(event.type || '').toUpperCase();
  const expired = ['EXPIRATION', 'BILLING_ISSUE'].includes(type) || (expiresAt && expiresAt <= new Date());
  user.subscriptionPlan = expired ? 'free' : plan;
  user.subscriptionStatus = expired ? 'expired' : (type === 'CANCELLATION' ? 'cancelled' : 'active');
  user.subscriptionExpiresAt = expiresAt;
  user.subscriptionStartedAt = event.purchased_at_ms ? new Date(Number(event.purchased_at_ms)) : user.subscriptionStartedAt;
  user.subscriptionRenewalStatus = type === 'CANCELLATION' ? 'cancelled' : expired ? 'not_applicable' : 'renewing';
  user.subscriptionProvider = 'revenuecat';
  user.subscriptionProviderCustomerId = appUserId;
  user.subscriptionProviderPurchaseId = event.transaction_id || event.purchase_id || null;
  user.subscriptionEntitlementId = entitlementId || null;
  await user.save();
  store.users = (await User.find().lean()).map(cacheUser);
  console.log(`RevenueCat subscription updated for account ${appUserId}: ${user.subscriptionPlan}/${user.subscriptionStatus}.`);
  return res.json({ ok: true });
});
app.use(express.json({ limit: '128kb' }));

// Auth Token Middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (err) {
      // Invalid or expired token
    }
  }
  next();
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const userSockets = new Map();
const roomParticipants = new Map();
const activeCalls = new Map();
const userCalls = new Map();
const callTimers = new Map();

function emitToUser(userId, event, payload) {
  io.to(`user:${String(userId)}`).emit(event, payload);
}

function requireAuth(req, res, next) {
  const user = store.users.find((item) => item.id === req.user?.userId);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.authenticatedUser = user;
  next();
}

function participantForCall(call, userId) {
  if (call.callerId === userId) return call.calleeId;
  if (call.calleeId === userId) return call.callerId;
  return null;
}

function saveCall(call) {
  const record = store.calls.find((item) => item.id === call.id);
  if (record) Object.assign(record, call);
  else store.calls.push(call);
  save();
}

function finishCall(call, status, endedBy) {
  const timer = callTimers.get(call.id);
  if (timer) clearTimeout(timer);
  callTimers.delete(call.id);
  const disconnectTimer = callTimers.get(`disconnect:${call.id}`);
  if (disconnectTimer) clearTimeout(disconnectTimer);
  callTimers.delete(`disconnect:${call.id}`);
  call.status = status;
  call.endedAt = new Date().toISOString();
  call.endedBy = endedBy || null;
  if (call.connectedAt) {
    call.durationSeconds = Math.max(0, Math.floor((Date.parse(call.endedAt) - Date.parse(call.connectedAt)) / 1000));
  } else {
    call.durationSeconds = 0;
  }
  saveCall(call);
  activeCalls.delete(call.id);
  userCalls.delete(call.callerId);
  userCalls.delete(call.calleeId);
}

function armCallTimeout(call, status, durationMs, onTimeout) {
  const existing = callTimers.get(call.id);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    if (activeCalls.get(call.id) !== call || call.status !== status) return;
    onTimeout();
  }, durationMs);
  timer.unref?.();
  callTimers.set(call.id, timer);
}

// Health check endpoints
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'BYTALK API', time: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ ok: true, service: 'BYTALK API', time: new Date().toISOString() }));

// AUTHENTICATION: REGISTER
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Full name is required' });
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.trim().toLowerCase();
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    // Check if email already registered
    const existing = await User.exists({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const newUser = await User.create({
      name: name.trim().slice(0, 80),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      country: '',
      nativeLanguage: '',
      learningLanguage: 'English',
      level: 'Beginner',
      online: true,
      streak: 1,
      minutes: 0,
      words: 0,
      createdAt: new Date().toISOString(),
    });
    const cachedUser = cacheUser(newUser.toObject());
    store.users.push(cachedUser);

    // Issue 15-day JWT token
    const token = signToken({ userId: cachedUser.id, email: newUser.email }, { expiresIn: '15d' });
    return res.status(201).json({ ok: true, user: { ...publicUser(newUser), email: newUser.email }, token });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error(`Registration database error: ${error.message}`);
    return res.status(503).json({ error: 'Registration service is temporarily unavailable.' });
  }
});

// AUTHENTICATION: LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const userDocument = await User.findOne({ email: cleanEmail }).select('+passwordHash');
    if (!userDocument || !verifyPassword(password, userDocument.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = cacheUser(userDocument.toObject());
    user.online = true;
    store.users = store.users.map((item) => item.id === user.id ? user : item);

    // Issue 15-day JWT token
    const token = signToken({ userId: user.id, email: user.email }, { expiresIn: '15d' });
    return res.json({ ok: true, user: { ...publicUser(userDocument), email: user.email }, token });
  } catch (error) {
    console.error(`Login database error: ${error.message}`);
    return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
  }
});

// AUTHENTICATION: VALIDATE SESSION / GET CURRENT USER
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  const token = authHeader.slice(7).trim();
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User session not found or account removed' });
    }
    return res.json({ ok: true, user: { ...publicUser(user), email: user.email } });
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Invalid or expired session token' });
  }
});

app.get('/api/subscription/plans', (req, res) => {
  res.json(Object.values(SUBSCRIPTION_PLANS));
});

app.get('/api/subscription', requireAuth, async (req, res) => {
  const user = await User.findById(req.authenticatedUser.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  res.json({ ...entitlementPayload(user), testMode: TEST_ENTITLEMENTS_ENABLED });
});

app.get('/api/subscription/status', requireAuth, async (req, res) => {
  const user = await User.findById(req.authenticatedUser.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  res.json({ ...entitlementPayload(user), testMode: TEST_ENTITLEMENTS_ENABLED });
});

app.post('/api/subscription/checkout', requireAuth, (req, res) => {
  res.status(503).json({
    error: 'Purchases are not configured on this backend. Use a configured App Store or Google Play RevenueCat offering.',
    code: 'subscription_provider_unavailable',
  });
});

app.post('/api/subscription/restore', requireAuth, (req, res) => {
  res.status(503).json({
    error: 'Purchase restoration is handled by the native RevenueCat app and is not configured on this backend.',
    code: 'subscription_provider_unavailable',
  });
});

app.post('/api/subscription/development/grant', requireAuth, async (req, res) => {
  if (!TEST_ENTITLEMENTS_ENABLED) {
    return res.status(404).json({ error: 'Development test entitlements are disabled.' });
  }
  const plan = String(req.body?.plan || '');
  if (!['plus', 'pro'].includes(plan)) {
    return res.status(400).json({ error: 'Choose the plus or pro development entitlement.' });
  }
  const user = await User.findById(req.authenticatedUser.id);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const now = new Date();
  user.subscriptionPlan = plan;
  user.subscriptionStatus = 'active';
  user.subscriptionProvider = 'development';
  user.subscriptionProviderCustomerId = `development:${user.id}`;
  user.subscriptionEntitlementId = `bytalk_${plan}`;
  user.subscriptionStartedAt = now;
  user.subscriptionExpiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  user.subscriptionRenewalStatus = 'not_renewing';
  await user.save();
  store.users = (await User.find().lean()).map(cacheUser);
  res.json({ ...entitlementPayload(user), testMode: true });
});

// USERS & PARTNERS
app.get('/api/users', requireAuth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.authenticatedUser._id } }).lean();
  store.users = (await User.find().lean()).map(cacheUser);
  res.json(users.map(publicUser));
});

async function listDiscoverUsers(req, res) {
  const currentUserId = req.authenticatedUser.id;
  const currentUser = await User.findById(currentUserId).lean();
  const q = String(req.query.q || '').toLowerCase();
  const topic = String(req.query.topic || 'All Topics');
  if (!PRACTICE_TOPICS.includes(topic)) {
    return res.status(400).json({ error: 'Invalid practice topic.' });
  }
  const eligibleQuery = { _id: { $ne: currentUserId } };
  const eligibleCount = await User.countDocuments(eligibleQuery);
  const mongoUsers = await User.find({
    _id: { $ne: currentUserId },
    ...practiceInterestQuery(topic),
  }).lean();
  store.users = (await User.find().lean()).map(cacheUser);
  const users = mongoUsers
    .map((user) => {
      const avatarUrl = user.profilePhotoUrl || null;
      return {
        id: String(user._id),
        name: user.name,
        displayName: user.displayName || user.name,
        avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : null,
        country: user.country || '',
        nativeLanguage: user.nativeLanguage || '',
        learningLanguage: user.learningLanguage || '',
        languages: [user.nativeLanguage, user.learningLanguage].filter(Boolean),
        level: user.level || '',
        practiceInterests: Array.isArray(user.practiceInterests) ? user.practiceInterests : [],
        online: (userSockets.get(String(user._id))?.size || 0) > 0,
        _matchScore: (
          (user.nativeLanguage && user.nativeLanguage === currentUser?.learningLanguage ? 10 : 0)
          + (user.learningLanguage && user.learningLanguage === currentUser?.nativeLanguage ? 10 : 0)
          + (Array.isArray(user.practiceInterests) && Array.isArray(currentUser?.practiceInterests)
            ? user.practiceInterests.filter((interest) => currentUser.practiceInterests.includes(interest)).length * 3
            : 0)
          + levelCompatibilityScore(user.level, currentUser?.level)
          + ((userSockets.get(String(user._id))?.size || 0) > 0 ? 1 : 0)
        ),
      };
    })
    .filter((user) =>
      [user.displayName, user.country, ...user.languages, user.level]
        .some((value) => String(value || '').toLowerCase().includes(q))
    );
  users.sort((left, right) => right._matchScore - left._matchScore || left.name.localeCompare(right.name));
  res.json({
    users: users.map(({ _matchScore, ...user }) => user),
    totalEligible: eligibleCount,
  });
}

app.get('/api/users/discover', requireAuth, listDiscoverUsers);
app.get('/api/partners', requireAuth, listDiscoverUsers);

app.patch('/api/profile/practice-interests', requireAuth, async (req, res) => {
  const practiceInterests = normalizePracticeInterests(req.body?.practiceInterests);
  if (!practiceInterests) {
    return res.status(400).json({ error: 'Choose valid practice interests.' });
  }
  const updated = await User.findByIdAndUpdate(
    req.authenticatedUser.id,
    { $set: { practiceInterests } },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ error: 'Profile not found.' });
  store.users = (await User.find().lean()).map(cacheUser);
  res.json({ ...publicUser(updated), email: updated.email });
});

app.post('/api/onboard', requireAuth, async (req, res) => {
  const { name, country, nativeLanguage, learningLanguage, level } = req.body;
  const practiceInterests = req.body.practiceInterests === undefined
    ? undefined
    : normalizePracticeInterests(req.body.practiceInterests);
  if (req.body.practiceInterests !== undefined && !practiceInterests) {
    return res.status(400).json({ error: 'Choose valid practice interests.' });
  }
  const me = req.authenticatedUser;
  for (const [k, v] of Object.entries({ name, country, nativeLanguage, learningLanguage, level })) {
    if (typeof v === 'string' && v.trim()) me[k] = v.trim().slice(0, 80);
  }
  const update = {
    name: me.name,
    country: me.country,
    nativeLanguage: me.nativeLanguage,
    learningLanguage: me.learningLanguage,
    level: me.level,
  };
  if (practiceInterests !== undefined) update.practiceInterests = practiceInterests;
  const updated = await User.findByIdAndUpdate(me.id, update, { new: true });
  store.users = store.users.map((user) => user.id === me.id ? cacheUser({ ...updated.toObject(), passwordHash: me.passwordHash }) : user);
  res.json({ ...publicUser(updated), email: updated.email });
});

function getRoom(roomId) {
  return store.rooms.find((room) => room.id === String(roomId));
}

function roomState(room) {
  const participants = roomParticipants.get(room.id) || new Map();
  return {
    id: room.id,
    name: room.name,
    topic: room.topic,
    level: room.level,
    participants: participants.size,
    mediaAvailable: LIVEKIT_AVAILABLE,
  };
}

function roomParticipantPayload(roomId) {
  const participants = roomParticipants.get(roomId) || new Map();
  return [...participants.keys()].map((id) => {
    const user = store.users.find((item) => item.id === id);
    return { id, name: user?.name || 'BYTALK user' };
  });
}

function broadcastRoomState(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  io.to(`room:${room.id}`).emit('room:state', {
    roomId: room.id,
    participants: roomParticipantPayload(room.id),
  });
  io.emit('rooms:changed', store.rooms.map(roomState));
}

app.get('/api/rooms', (req, res) => res.json(store.rooms.map(roomState)));

app.get('/api/rooms/:id/session', requireAuth, async (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (!LIVEKIT_AVAILABLE) {
    console.warn(`LiveKit session requested for room ${room.id}, but media service is not configured.`);
    return res.status(503).json({ error: 'Live audio is not configured on the backend.' });
  }
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: String(req.authenticatedUser.id),
    name: req.authenticatedUser.name,
    ttl: '1h',
  });
  token.addGrant({
    roomJoin: true,
    room: room.id,
    canPublish: true,
    canSubscribe: true,
  });
  res.json({ roomId: room.id, url: LIVEKIT_URL, token: await token.toJwt() });
});

app.get('/api/messages/:a/:b', requireAuth, async (req, res) => {
  const { a, b } = req.params;
  const currentUserId = String(req.authenticatedUser.id);
  if (![a, b].includes(String(currentUserId)) || a === b || !store.users.some((user) => user.id === (a === currentUserId ? b : a))) {
    return res.status(403).json({ error: 'You are not a participant in this conversation' });
  }
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100));
  const before = req.query.before ? Date.parse(String(req.query.before)) : Infinity;
  if (!Number.isFinite(before) && before !== Infinity) {
    return res.status(400).json({ error: 'Invalid message cursor' });
  }
  const query = {
    $or: [{ from: a, to: b }, { from: b, to: a }],
    $and: [{ $or: [{ createdAt: { $gte: messageCutoff() } }, { createdAt: { $exists: false }, at: { $gte: messageCutoff() } }] }],
    ...(before !== Infinity ? { at: { $lt: new Date(before) } } : {}),
  };
  const messages = await Message.find(query).sort({ at: -1 }).limit(limit).lean();
  const unread = messages.filter((message) => message.to === currentUserId && !message.readAt);
  if (unread.length) {
    const readAt = new Date();
    await Message.updateMany(
      { id: { $in: unread.map((message) => message.id) }, to: currentUserId, readAt: null },
      { $set: { readAt } }
    );
    unread.forEach((message) => {
      emitToUser(message.from, 'message:status', {
        id: message.id,
        deliveredAt: message.deliveredAt ? new Date(message.deliveredAt).toISOString() : null,
        readAt: readAt.toISOString(),
      });
      message.readAt = readAt;
    });
  }
  res.json(messages.reverse().map(publicMessage));
});

app.post('/api/messages', requireAuth, async (req, res) => {
  const { to, text } = req.body;
  const senderId = req.authenticatedUser.id;
  if (typeof to !== 'string' || to === senderId || !store.users.some((user) => user.id === to) || typeof text !== 'string' || !text.trim() || text.length > 1500) {
    return res.status(400).json({ error: 'Invalid message' });
  }
  const deliveredAt = (userSockets.get(String(to))?.size || 0) > 0 ? new Date() : null;
  const msg = await Message.create({
    id: crypto.randomUUID(),
    from: String(senderId),
    to,
    text: text.trim(),
    at: new Date(),
    createdAt: new Date(),
    deliveredAt,
  });
  const result = publicMessage(msg);
  console.log(`Message ${result.id} persisted; delivery target ${result.to} has ${userSockets.get(String(to))?.size || 0} active socket(s).`);
  emitToUser(senderId, 'message:new', result);
  emitToUser(to, 'message:new', result);
  res.status(201).json(result);
});

app.get('/api/messages/conversations', requireAuth, async (req, res) => {
  const currentUserId = String(req.authenticatedUser.id);
  const messages = await Message.find({
    $or: [{ from: currentUserId }, { to: currentUserId }],
    $and: [{ $or: [{ createdAt: { $gte: messageCutoff() } }, { createdAt: { $exists: false }, at: { $gte: messageCutoff() } }] }],
  }).sort({ at: -1 }).lean();
  const conversations = new Map();
  for (const message of messages) {
    const partnerId = message.from === currentUserId ? message.to : message.from;
    if (conversations.has(partnerId)) continue;
    const partner = store.users.find((user) => user.id === partnerId);
    conversations.set(partnerId, {
      user: partner
        ? {
            id: partner.id,
            name: partner.name,
            displayName: partner.displayName || partner.name,
            avatarUrl: partner.profilePhotoUrl || null,
            country: partner.country || '',
            learningLanguage: partner.learningLanguage || '',
            online: Boolean(userSockets.get(partner.id)?.size),
          }
        : { id: partnerId, name: 'BYTALK user', displayName: 'BYTALK user', avatarUrl: null, country: '', learningLanguage: '', online: false },
      latestMessage: publicMessage(message),
    });
  }
  const unread = await Message.aggregate([
    { $match: { to: currentUserId, readAt: null, $or: [{ createdAt: { $gte: messageCutoff() } }, { createdAt: { $exists: false }, at: { $gte: messageCutoff() } }] } },
    { $group: { _id: '$from', count: { $sum: 1 } } },
  ]);
  const unreadByUser = new Map(unread.map((entry) => [entry._id, entry.count]));
  res.json([...conversations.values()].map((conversation) => ({
    ...conversation,
    unreadCount: unreadByUser.get(conversation.user.id) || 0,
  })));
});

app.get('/api/messages/unread', requireAuth, async (req, res) => {
  const unread = await Message.aggregate([
    { $match: { to: String(req.authenticatedUser.id), readAt: null, $or: [{ createdAt: { $gte: messageCutoff() } }, { createdAt: { $exists: false }, at: { $gte: messageCutoff() } }] } },
    { $group: { _id: '$from', count: { $sum: 1 } } },
  ]);
  res.json(Object.fromEntries(unread.map((entry) => [entry._id, entry.count])));
});

app.get('/api/calls', requireAuth, (req, res) => {
  const currentUserId = req.authenticatedUser.id;
  res.json(
    store.calls
      .filter((call) => call.callerId === currentUserId || call.calleeId === currentUserId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 100)
  );
});

app.get('/api/rtc-config', requireAuth, (req, res) => {
  const iceServers = (process.env.RTC_STUN_URLS || 'stun:stun.l.google.com:19302')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((urls) => ({ urls }));
  if (TURN_URLS.length) {
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
    const username = `${expiresAt}:${req.authenticatedUser.id}`;
    const credential = crypto.createHmac('sha1', TURN_SHARED_SECRET).update(username).digest('base64');
    iceServers.push({ urls: TURN_URLS, username, credential });
  }
  res.set('Cache-Control', 'no-store');
  res.json({ iceServers });
});
app.get('/api/vocabulary/:userId', (req, res) => {
  const currentUserId = req.user?.userId || req.params.userId;
  res.json(store.vocabulary.filter((v) => v.userId === currentUserId || v.userId === req.params.userId));
});

app.post('/api/vocabulary', (req, res) => {
  const { word, category } = req.body;
  const currentUserId = req.user?.userId || req.body.userId || 'u1';
  if (typeof word !== 'string' || !word.trim() || word.length > 100) return res.status(400).json({ error: 'Invalid word' });
  const item = { id: crypto.randomUUID(), userId: currentUserId, word: word.trim(), category: category || 'Conversation' };
  store.vocabulary.push(item);
  const u = store.users.find((x) => x.id === item.userId);
  if (u) u.words = (u.words || 0) + 1;
  save();
  res.status(201).json(item);
});

app.get('/api/stats', (req, res) =>
  res.json({
    users: store.users.length,
    rooms: store.rooms.length,
    messages: store.messages.length,
    reports: store.reports.filter((r) => r.status === 'open').length,
    activeUsers: store.users.filter((x) => x.online).length,
  })
);

app.get('/api/reports', (req, res) => res.json(store.reports));

app.post('/api/reports', (req, res) => {
  const { reason, reportedUserId } = req.body;
  if (typeof reason !== 'string' || !reason.trim()) return res.status(400).json({ error: 'Reason required' });
  const report = {
    id: crypto.randomUUID(),
    reason: reason.slice(0, 500),
    reportedUserId: reportedUserId || null,
    status: 'open',
    at: new Date().toISOString(),
  };
  store.reports.push(report);
  save();
  res.status(201).json(report);
});

app.patch('/api/reports/:id', (req, res) => {
  const report = store.reports.find((r) => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  if (!['open', 'resolved'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  report.status = req.body.status;
  save();
  res.json(report);
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const decoded = verifyToken(token);
    const user = store.users.find((item) => item.id === decoded.userId);
    if (!user) throw new Error('Account not found');
    socket.data.userId = user.id;
    next();
  } catch {
    next(new Error('Authentication required'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.data.roomIds = new Set();
  console.log(`Socket connected for user ${userId}.`);
  const sockets = userSockets.get(userId) || new Set();
  const wasOnline = sockets.size > 0;
  sockets.add(socket.id);
  userSockets.set(userId, sockets);
  socket.join(`user:${userId}`);
  socket.emit('presence:state', [...userSockets.entries()]
    .filter(([, connectedSockets]) => connectedSockets.size > 0)
    .map(([connectedUserId]) => connectedUserId));

  socket.on('room:join', ({ roomId } = {}, acknowledge = () => {}) => {
    const room = getRoom(roomId);
    if (!room) {
      acknowledge({ error: 'Room not found' });
      return;
    }
    if (!LIVEKIT_AVAILABLE) {
      acknowledge({ error: 'Live audio is not configured on the backend.' });
      return;
    }
    const normalizedRoomId = room.id;
    let participants = roomParticipants.get(normalizedRoomId);
    if (!participants) {
      participants = new Map();
      roomParticipants.set(normalizedRoomId, participants);
    }
    let socketIds = participants.get(userId);
    const wasMember = Boolean(socketIds?.size);
    if (!socketIds) {
      socketIds = new Set();
      participants.set(userId, socketIds);
    }
    socketIds.add(socket.id);
    socket.data.roomIds.add(normalizedRoomId);
    socket.join(`room:${normalizedRoomId}`);
    const state = {
      roomId: normalizedRoomId,
      participants: roomParticipantPayload(normalizedRoomId),
    };
    acknowledge({ ok: true, ...state });
    if (!wasMember) {
      socket.to(`room:${normalizedRoomId}`).emit('room:participant-joined', {
        roomId: normalizedRoomId,
        participant: { id: userId, name: store.users.find((user) => user.id === userId)?.name || 'BYTALK user' },
      });
      broadcastRoomState(normalizedRoomId);
    }
  });

  socket.on('room:leave', ({ roomId } = {}, acknowledge = () => {}) => {
    leaveRoom(socket, roomId);
    acknowledge({ ok: true });
  });
  if (!wasOnline) io.emit('presence:update', { userId, online: true });

  const ongoingCallId = userCalls.get(userId);
  if (ongoingCallId) {
    const call = activeCalls.get(ongoingCallId);
    if (call) {
      emitToUser(call.callerId, 'call:state', { callId: call.id, status: 'reconnecting' });
      emitToUser(call.calleeId, 'call:state', { callId: call.id, status: 'reconnecting' });
    }
  }

  socket.on('ping:app', () => socket.emit('pong:app'));
  socket.on('error', (error) => {
    console.warn(`Socket error for user ${userId}: ${error?.message || 'unknown error'}`);
  });

  socket.on('typing:start', ({ to } = {}) => {
    if (typeof to === 'string' && to !== userId && store.users.some((user) => user.id === to)) {
      emitToUser(to, 'typing:update', { from: userId, typing: true });
    }
  });

  socket.on('typing:stop', ({ to } = {}) => {
    if (typeof to === 'string' && to !== userId) {
      emitToUser(to, 'typing:update', { from: userId, typing: false });
    }
  });

  socket.on('call:invite', async ({ to, type } = {}, acknowledge = () => {}) => {
    console.log(`Call invite received from ${userId} to ${to} (${type}).`);
    if (typeof acknowledge !== 'function') return;
    if (typeof to !== 'string' || to === userId || !['audio', 'video'].includes(type)) {
      acknowledge({ error: 'Invalid call request' });
      return;
    }
    if (!store.users.some((user) => user.id === to)) {
      acknowledge({ error: 'User not found' });
      return;
    }
    if (!(userSockets.get(to)?.size || 0)) {
      console.log(`Call invite rejected: recipient ${to} is offline.`);
      acknowledge({ error: 'This person is offline' });
      return;
    }
    let restrictedForRecipient = false;
    if (type === 'video') {
      const [caller, callee] = await Promise.all([User.findById(userId), User.findById(to)]);
      if (!caller || !callee || !canUseVideo(caller)) {
        acknowledge({ error: 'Video calling requires an available premium video allowance for both participants.', code: 'video_plan_required' });
        return;
      }
      restrictedForRecipient = !canUseVideo(callee);
    }
    if (userCalls.has(userId) || userCalls.has(to)) {
      acknowledge({ error: 'One of you is already on another call' });
      return;
    }

    const createdAt = new Date().toISOString();
    const call = {
      id: crypto.randomUUID(),
      callerId: userId,
      calleeId: to,
      type,
      status: 'ringing',
      createdAt,
    };
    activeCalls.set(call.id, call);
    userCalls.set(userId, call.id);
    userCalls.set(to, call.id);
    saveCall(call);

    const caller = store.users.find((user) => user.id === userId);
    emitToUser(to, 'call:incoming', {
      callId: call.id,
      type,
      createdAt,
      restricted: restrictedForRecipient,
      restrictionReason: restrictedForRecipient ? 'A BYTALK Plus or Pro subscription is required to accept video calls.' : null,
      caller: sanitizeUser(caller),
    });
    console.log(`Call ${call.id} is ringing for ${to}.`);
    acknowledge({ callId: call.id, status: 'ringing' });
    armCallTimeout(call, 'ringing', 35000, () => {
      finishCall(call, 'missed', null);
      emitToUser(call.callerId, 'call:missed', { callId: call.id, status: 'missed' });
      emitToUser(call.calleeId, 'call:ended', { callId: call.id, status: 'missed' });
    });
  });

  socket.on('call:accept', async ({ callId } = {}, acknowledge = () => {}) => {
    console.log(`Call accept received from ${userId} for ${callId}.`);
    const call = activeCalls.get(callId);
    if (!call || call.calleeId !== userId || call.status !== 'ringing') {
      acknowledge({ error: 'This call is no longer available' });
      return;
    }
    if (call.type === 'video') {
      const [caller, callee] = await Promise.all([
        User.findById(call.callerId),
        User.findById(call.calleeId),
      ]);
      if (!caller || !callee || !canUseVideo(caller) || !canUseVideo(callee)) {
        acknowledge({ error: 'Video calling is unavailable because a participant has reached the plan limit.', code: 'video_plan_required' });
        emitToUser(call.callerId, 'call:ended', { callId: call.id, status: 'restricted', reason: 'video_plan_required' });
        finishCall(call, 'restricted', userId);
        return;
      }
      resetUsageIfNeeded(caller);
      resetUsageIfNeeded(callee);
      caller.videoCallsUsed += 1;
      callee.videoCallsUsed += 1;
      await Promise.all([
        User.findByIdAndUpdate(call.callerId, { usageMonth: caller.usageMonth, videoCallsUsed: caller.videoCallsUsed }),
        User.findByIdAndUpdate(call.calleeId, { usageMonth: callee.usageMonth, videoCallsUsed: callee.videoCallsUsed }),
      ]);
      store.users = (await User.find().lean()).map(cacheUser);
    }
    const timer = callTimers.get(call.id);
    if (timer) clearTimeout(timer);
    callTimers.delete(call.id);
    call.status = 'connecting';
    call.acceptedAt = new Date().toISOString();
    saveCall(call);
    emitToUser(call.callerId, 'call:accepted', { callId: call.id, status: 'connecting' });
    acknowledge({ ok: true });
    armCallTimeout(call, 'connecting', 45000, () => {
      finishCall(call, 'failed', null);
      emitToUser(call.callerId, 'call:ended', { callId: call.id, status: 'failed', reason: 'connection-timeout' });
      emitToUser(call.calleeId, 'call:ended', { callId: call.id, status: 'failed', reason: 'connection-timeout' });
    });
  });

  socket.on('call:reject', ({ callId } = {}, acknowledge = () => {}) => {
    console.log(`Call reject received from ${userId} for ${callId}.`);
    const call = activeCalls.get(callId);
    if (!call || call.calleeId !== userId || call.status !== 'ringing') {
      acknowledge({ error: 'This call is no longer available' });
      return;
    }
    finishCall(call, 'rejected', userId);
    emitToUser(call.callerId, 'call:rejected', { callId: call.id, status: 'rejected' });
    emitToUser(call.calleeId, 'call:ended', { callId: call.id, status: 'rejected' });
    acknowledge({ ok: true });
  });

  socket.on('call:signal', ({ callId, kind, signal } = {}, acknowledge = () => {}) => {
    const call = activeCalls.get(callId);
    const recipientId = call && participantForCall(call, userId);
    const validKind = ['offer', 'answer', 'ice'].includes(kind);
    const validRole = (kind !== 'offer' || call?.callerId === userId)
      && (kind !== 'answer' || call?.calleeId === userId);
    let payloadSize = Infinity;
    try {
      payloadSize = JSON.stringify(signal).length;
    } catch {}
    if (!call || call.status === 'ringing' || !recipientId || !validKind || !validRole || !signal || payloadSize > 100000) {
      acknowledge({ error: 'Invalid or unauthorized call signal' });
      return;
    }
    console.log(`Call signal ${kind} for ${callId} from ${userId} to ${recipientId}.`);
    emitToUser(recipientId, 'call:signal', { callId, kind, signal });
    acknowledge({ ok: true });
  });

  socket.on('call:connected', ({ callId } = {}) => {
    const call = activeCalls.get(callId);
    if (!call || !participantForCall(call, userId) || call.status === 'ringing') return;
    for (const participantId of [call.callerId, call.calleeId]) {
      const reconnectTimer = callTimers.get(`disconnect:${call.id}:${participantId}`);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      callTimers.delete(`disconnect:${call.id}:${participantId}`);
    }
    if (!call.connectedAt) {
      const timer = callTimers.get(call.id);
      if (timer) clearTimeout(timer);
      callTimers.delete(call.id);
      call.connectedAt = new Date().toISOString();
      call.status = 'connected';
      saveCall(call);
    }
    emitToUser(call.callerId, 'call:state', { callId, status: 'connected', connectedAt: call.connectedAt });
    emitToUser(call.calleeId, 'call:state', { callId, status: 'connected', connectedAt: call.connectedAt });
  });

  socket.on('call:end', ({ callId } = {}, acknowledge = () => {}) => {
    const call = activeCalls.get(callId);
    if (!call || !participantForCall(call, userId)) {
      acknowledge({ error: 'This call is no longer available' });
      return;
    }
    finishCall(call, call.status === 'ringing' ? 'cancelled' : 'ended', userId);
    const ended = { callId, status: call.status, endedBy: userId };
    emitToUser(call.callerId, 'call:ended', ended);
    emitToUser(call.calleeId, 'call:ended', ended);
    acknowledge({ ok: true });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected for user ${userId}.`);
    for (const roomId of socket.data.roomIds) leaveRoom(socket, roomId);
    const currentSockets = userSockets.get(userId);
    currentSockets?.delete(socket.id);
    if (currentSockets?.size) return;
    userSockets.delete(userId);
    io.emit('presence:update', { userId, online: false });

    const callId = userCalls.get(userId);
    const call = activeCalls.get(callId);
    if (call) {
      const otherUserId = participantForCall(call, userId);
      emitToUser(otherUserId, 'call:state', { callId, status: 'reconnecting' });
      const timerKey = `disconnect:${call.id}:${userId}`;
      const timer = setTimeout(() => {
        if (!activeCalls.has(callId) || (userSockets.get(userId)?.size || 0)) return;
        finishCall(call, 'ended', userId);
        const ended = { callId, status: 'ended', reason: 'disconnected' };
        emitToUser(call.callerId, 'call:ended', ended);
        emitToUser(call.calleeId, 'call:ended', ended);
      }, 30000);
      timer.unref?.();
      callTimers.set(timerKey, timer);
    }
  });
});

function leaveRoom(socket, roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  const participants = roomParticipants.get(room.id);
  const socketIds = participants?.get(socket.data.userId);
  if (!socketIds) return;
  socketIds.delete(socket.id);
  socket.data.roomIds.delete(room.id);
  socket.leave(`room:${room.id}`);
  if (socketIds.size) return;
  participants.delete(socket.data.userId);
  if (!participants.size) roomParticipants.delete(room.id);
  socket.to(`room:${room.id}`).emit('room:participant-left', {
    roomId: room.id,
    userId: socket.data.userId,
  });
  broadcastRoomState(room.id);
}

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, '0.0.0.0', () => console.log(`BYTALK backend running on http://localhost:${port}`));
