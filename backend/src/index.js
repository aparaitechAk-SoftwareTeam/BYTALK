import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dns from 'dns';
import mongoose from 'mongoose';
import { User, publicUser } from './models/User.js';
import { Message, publicMessage } from './models/Message.js';
import { CallHistory } from './models/CallHistory.js';
import { PracticeSession } from './models/PracticeSession.js';
import { messageCutoff } from './messageRetention.js';
import { SubscriptionEvent } from './models/SubscriptionEvent.js';
import { Plan } from './models/Plan.js';
import { SUBSCRIPTION_PLANS, DEFAULT_PRO_PLANS, activeSubscription, canUseVideo, entitlementPayload, resetUsageIfNeeded } from './subscriptions.js';
import { AccessToken } from 'livekit-server-sdk';
import { generateAiResponse } from './aiService.js';

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
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_TvoCCSairIqmOY';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'TE12vGfhhrOJfbYUXQawyayi';
const RAZORPAY_AVAILABLE = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
if (RAZORPAY_AVAILABLE) {
  console.log(`Razorpay payment gateway initialized with Key: ${RAZORPAY_KEY_ID.slice(0, 12)}...`);
}
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
const LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Spanish', 'French', 'Japanese', 'Mandarin Chinese',
  'Arabic', 'German', 'Portuguese', 'Bengali', 'Russian', 'Urdu', 'Indonesian',
  'Korean', 'Italian', 'Turkish', 'Tamil', 'Telugu', 'Vietnamese', 'Polish', 'Dutch',
  'Greek', 'Hebrew', 'Thai', 'Swedish', 'Czech', 'Hungarian', 'Romanian', 'Danish',
  'Finnish', 'Norwegian', 'Swahili', 'Malay', 'Ukrainian',
];
const AI_SESSIONS = new Map();
const AI_REQUESTS = new Map();
// Real AI service integration powered by ./aiService.js

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

function normalizeLevel(value) {
  const levels = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced', 'Fluent', 'Proficient'];
  return typeof value === 'string' && levels.includes(value) ? value : null;
}

function normalizeSettings(body = {}) {
  const result = {};
  if (body.learningLanguage !== undefined && typeof body.learningLanguage === 'string' && LANGUAGES.includes(body.learningLanguage)) {
    result.learningLanguage = body.learningLanguage;
  }
  if (body.level !== undefined) {
    const level = normalizeLevel(body.level);
    if (!level) return null;
    result.level = level;
  }
  if (body.uiLanguage !== undefined && body.uiLanguage !== 'English') return null;
  if (body.uiLanguage !== undefined) result.uiLanguage = body.uiLanguage;
  if (body.silenceMode !== undefined) result.silenceMode = Boolean(body.silenceMode);
  if (body.appearance !== undefined && ['light', 'dark', 'system'].includes(body.appearance)) result.appearance = body.appearance;
  if (body.textScale !== undefined && Number.isFinite(Number(body.textScale))) {
    const textScale = Number(body.textScale);
    if (textScale < 0.9 || textScale > 1.25) return null;
    result.textScale = textScale;
  }
  if (body.notificationPreferences !== undefined) {
    if (!body.notificationPreferences || typeof body.notificationPreferences !== 'object') return null;
    result.notificationPreferences = {};
    for (const key of ['push', 'messages', 'incomingCalls', 'missedCalls', 'practiceReminders', 'subscriptions']) {
      if (body.notificationPreferences[key] !== undefined) result.notificationPreferences[key] = Boolean(body.notificationPreferences[key]);
    }
  }
  if (body.audioPreferences !== undefined) {
    if (!body.audioPreferences || typeof body.audioPreferences !== 'object') return null;
    result.audioPreferences = {};
    if (body.audioPreferences.manager !== undefined && ['system', 'speaker', 'earpiece'].includes(body.audioPreferences.manager)) {
      result.audioPreferences.manager = body.audioPreferences.manager;
    }
    for (const key of ['echoCanceller', 'noiseSuppressor']) {
      if (body.audioPreferences[key] !== undefined) result.audioPreferences[key] = Boolean(body.audioPreferences[key]);
    }
  }
  return result;
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

const auditLogs = [
  { id: 'aud-1', timestamp: new Date(Date.now() - 3600000).toISOString(), actor: 'System', eventType: 'SYSTEM_BOOT', target: 'BYTALK Server Online' },
  { id: 'aud-2', timestamp: new Date(Date.now() - 1800000).toISOString(), actor: 'Razorpay Gateway', eventType: 'PAYMENT_GATEWAY_INITIALIZED', target: 'rzp_live_TvoCCSairIqmOY' },
];

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI must be configured in backend/.env.');
}

try {
  if (mongoUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch {}
  }
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
  await CallHistory.createIndexes();
  await PracticeSession.createIndexes();
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

  // Ensure default PRO plans are seeded to MongoDB
  try {
    await Plan.createIndexes();
    const existingPlans = await Plan.countDocuments();
    if (existingPlans === 0) {
      await Plan.insertMany(DEFAULT_PRO_PLANS);
      console.log(`Seeded ${DEFAULT_PRO_PLANS.length} default subscription plan(s) to MongoDB.`);
    }
  } catch (planSeedErr) {
    console.warn('[Plans Seed Error]', planSeedErr.message);
  }
} catch (error) {
  console.error(`MongoDB connection failed: ${error.message}`);
  process.exitCode = 1;
  throw error;
}

async function getAllPlans() {
  try {
    const dbPlans = await Plan.find().sort({ order: 1, createdAt: 1 }).lean();
    if (dbPlans && dbPlans.length > 0) return dbPlans;
  } catch (err) {
    console.warn('[Plans] Failed to read from DB:', err.message);
  }
  return DEFAULT_PRO_PLANS;
}

async function getActivePlans() {
  const plans = await getAllPlans();
  return plans.filter((p) => p.active !== false);
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
      const cached = store?.users?.find((user) => user.id === decoded.userId);
      if (cached && Number(decoded.tokenVersion || 0) !== Number(cached.tokenVersion || 0)) {
        throw new Error('Session invalidated');
      }
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

async function requireAuth(req, res, next) {
  let user = store.users.find((item) => String(item.id) === String(req.user?.userId));
  if (!user && req.user?.userId) {
    try {
      const dbUser = await User.findById(req.user.userId).lean();
      if (dbUser) {
        user = cacheUser(dbUser);
        store.users.push(user);
      }
    } catch {}
  }
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

function normalizedCallHistoryStatus(status) {
  if (status === 'ended') return 'completed';
  if (status === 'cancelled') return 'rejected';
  if (status === 'restricted') return 'rejected';
  return ['completed', 'missed', 'rejected', 'failed'].includes(status) ? status : 'failed';
}

async function persistCallHistory(call) {
  const endedAt = new Date(call.endedAt);
  const connectedAt = call.connectedAt ? new Date(call.connectedAt) : null;
  await CallHistory.findOneAndUpdate(
    { callId: call.id },
    {
      $set: {
        callerId: String(call.callerId),
        calleeId: String(call.calleeId),
        type: call.type,
        status: normalizedCallHistoryStatus(call.status),
        connectedAt,
        endedAt,
        durationSeconds: Number(call.durationSeconds) || 0,
        createdAt: new Date(call.createdAt),
      },
      $setOnInsert: { callId: call.id },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
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
  return persistCallHistory(call).catch((error) => {
    console.error(`Call history persistence failed for ${call.id}: ${error.message}`);
    throw error;
  });
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
app.get('/', (req, res) => res.json({ ok: true, service: 'BYTALK Backend API', time: new Date().toISOString() }));
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
    const token = signToken({ userId: cachedUser.id, email: newUser.email, tokenVersion: newUser.tokenVersion || 0 }, { expiresIn: '15d' });
    return res.status(201).json({
      ok: true,
      user: { ...publicUser(newUser), email: newUser.email },
      subscription: entitlementPayload(newUser),
      token,
    });
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
    const token = signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion || 0 }, { expiresIn: '15d' });
    return res.json({
      ok: true,
      user: { ...publicUser(userDocument), email: user.email },
      subscription: entitlementPayload(userDocument),
      token,
    });
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
    return res.json({
      ok: true,
      user: { ...publicUser(user), email: user.email },
      subscription: entitlementPayload(user),
    });
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Invalid or expired session token' });
  }
});

app.get('/api/settings', requireAuth, async (req, res) => {
  const user = await User.findById(req.authenticatedUser.id).lean();
  if (!user) return res.status(404).json({ error: 'Profile not found.' });
  res.json({
    learningLanguage: user.learningLanguage,
    level: user.level,
    uiLanguage: user.uiLanguage || 'English',
    notificationPreferences: user.notificationPreferences || {},
    silenceMode: Boolean(user.silenceMode),
    appearance: user.appearance || 'system',
    textScale: user.textScale || 1,
    audioPreferences: user.audioPreferences || {},
    blockedUsers: (user.blockedUsers || []).map((id) => {
      const blocked = store.users.find((candidate) => candidate.id === id);
      return blocked ? { id, name: blocked.name, profilePhotoUrl: blocked.profilePhotoUrl || null } : null;
    }).filter(Boolean),
    subscription: entitlementPayload(user),
    provider: user.subscriptionProvider || null,
  });
});

app.patch('/api/settings', requireAuth, async (req, res) => {
  const update = normalizeSettings(req.body);
  if (!update) return res.status(400).json({ error: 'One or more settings values are invalid.' });
  const user = await User.findByIdAndUpdate(req.authenticatedUser.id, { $set: update }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ error: 'Profile not found.' });
  store.users = (await User.find().lean()).map(cacheUser);
  res.json({ ok: true, settings: { ...update, learningLanguage: user.learningLanguage, level: user.level } });
});

app.post('/api/users/:userId/block', requireAuth, async (req, res) => {
  const targetId = String(req.params.userId);
  if (targetId === String(req.authenticatedUser.id) || !(await User.exists({ _id: targetId }))) {
    return res.status(400).json({ error: 'Invalid user to block.' });
  }
  await User.findByIdAndUpdate(req.authenticatedUser.id, { $addToSet: { blockedUsers: targetId } });
  res.json({ ok: true });
});

app.delete('/api/users/:userId/block', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.authenticatedUser.id, { $pull: { blockedUsers: String(req.params.userId) } });
  res.json({ ok: true });
});

app.get('/api/account/export', requireAuth, async (req, res) => {
  const user = await User.findById(req.authenticatedUser.id).select('-passwordHash').lean();
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  const [userMessages, userCalls, practiceSessions] = await Promise.all([
    Message.find({ $or: [{ from: String(user._id) }, { to: String(user._id) }] }).select('-_id -__v').lean(),
    CallHistory.find({ $or: [{ callerId: String(user._id) }, { calleeId: String(user._id) }] }).select('-_id -__v').lean(),
    PracticeSession.find({ userId: String(user._id) }).select('-_id -__v').lean(),
  ]);
  res.json({ exportedAt: new Date().toISOString(), profile: publicUser(user), messages: userMessages, calls: userCalls, practiceSessions });
});

app.post('/api/account/logout-all', requireAuth, async (req, res) => {
  const updated = await User.findByIdAndUpdate(req.authenticatedUser.id, { $inc: { tokenVersion: 1 } }, { new: true }).lean();
  store.users = store.users.map((user) => user.id === String(req.authenticatedUser.id) ? cacheUser(updated) : user);
  res.json({ ok: true });
});

app.delete('/api/account', requireAuth, async (req, res) => {
  const confirmation = String(req.body?.confirmation || '');
  if (confirmation !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm account deletion.' });
  const userId = String(req.authenticatedUser.id);
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || typeof req.body?.password !== 'string' || !verifyPassword(req.body.password, user.passwordHash)) {
    return res.status(401).json({ error: 'Re-authentication failed.' });
  }
  await Promise.all([
    User.deleteOne({ _id: userId }),
    Message.deleteMany({ $or: [{ from: userId }, { to: userId }] }),
    CallHistory.deleteMany({ $or: [{ callerId: userId }, { calleeId: userId }] }),
    PracticeSession.deleteMany({ userId }),
  ]);
  store.users = store.users.filter((user) => user.id !== userId);
  res.json({ ok: true });
});

function enforceAiRateLimit(userId, user = null) {
  if (user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'plus') {
    return true; // Unlimited AI practice for PRO subscribers
  }
  const now = Date.now();
  const recent = (AI_REQUESTS.get(userId) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 40) return false;
  recent.push(now);
  AI_REQUESTS.set(userId, recent);
  return true;
}

// AI Practice & Conversation Endpoints (BYTALK AI Partner)

// Periodic cleanup of idle AI sessions (> 3 hours)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of AI_SESSIONS.entries()) {
    if (now - (session.lastActiveAt || session.startedAt) > 3 * 60 * 60 * 1000) {
      AI_SESSIONS.delete(id);
    }
  }
}, 30 * 60 * 1000);

/**
 * POST /api/ai/chat
 * Primary authenticated AI conversation endpoint supporting:
 * - message, topic, language, proficiencyLevel, conversationId, conversationHistory
 */
app.post('/api/ai/chat', requireAuth, async (req, res) => {
  const userId = String(req.authenticatedUser.id);
  if (!enforceAiRateLimit(userId, req.authenticatedUser)) {
    return res.status(429).json({ error: 'AI practice rate limit reached. Please wait a moment before sending more messages.' });
  }

  const {
    message,
    topic = 'All Topics',
    language = req.authenticatedUser.learningLanguage || 'English',
    proficiencyLevel = req.authenticatedUser.level || 'Beginner',
    conversationId,
    conversationHistory
  } = req.body || {};

  const cleanTopic = String(topic || 'All Topics').trim();
  const cleanLanguage = String(language || 'English').trim();
  const cleanLevel = String(proficiencyLevel || 'Beginner').trim();
  const cleanMessage = typeof message === 'string' ? message.trim() : '';

  if (cleanMessage && cleanMessage.length > 1500) {
    return res.status(400).json({ error: 'Message cannot exceed 1500 characters.' });
  }

  let sessionId = conversationId;
  let session = sessionId ? AI_SESSIONS.get(sessionId) : null;

  if (session && session.userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized to access this AI conversation.' });
  }

  if (!session) {
    sessionId = crypto.randomUUID();
    session = {
      id: sessionId,
      userId,
      topic: cleanTopic,
      language: cleanLanguage,
      level: cleanLevel,
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      messages: Array.isArray(conversationHistory) ? [...conversationHistory] : []
    };
    AI_SESSIONS.set(sessionId, session);
  }

  if (cleanTopic) session.topic = cleanTopic;
  if (cleanLanguage) session.language = cleanLanguage;
  if (cleanLevel) session.level = cleanLevel;
  session.lastActiveAt = Date.now();

  try {
    if (cleanMessage) {
      session.messages.push({
        role: 'user',
        content: cleanMessage,
        timestamp: new Date().toISOString()
      });
    }

    const aiReply = await generateAiResponse({
      topic: session.topic,
      language: session.language,
      proficiencyLevel: session.level,
      messages: session.messages
    });

    const aiMessage = {
      role: 'assistant',
      content: aiReply,
      timestamp: new Date().toISOString()
    };
    session.messages.push(aiMessage);

    res.json({
      success: true,
      response: aiReply,
      message: aiMessage,
      conversationId: sessionId,
      sessionId,
      topic: session.topic,
      language: session.language,
      proficiencyLevel: session.level
    });
  } catch (error) {
    if (cleanMessage && session.messages[session.messages.length - 1]?.role === 'user') {
      session.messages.pop();
    }
    const status = error.status || (error.code === 'ai_provider_unavailable' ? 503 : 502);
    res.status(status).json({
      success: false,
      error: error.message || 'The AI conversation service could not respond.',
      code: error.code || 'ai_provider_error'
    });
  }
});

/**
 * POST /api/practice/ai/start
 * Initializes a new conversation with BYTALK AI Partner and returns greeting.
 */
app.post('/api/practice/ai/start', requireAuth, async (req, res) => {
  const userId = String(req.authenticatedUser.id);
  if (!enforceAiRateLimit(userId, req.authenticatedUser)) {
    return res.status(429).json({ error: 'AI practice rate limit reached. Try again shortly.' });
  }

  const topic = String(req.body?.topic || 'All Topics').trim();
  const language = String(req.body?.language || req.authenticatedUser.learningLanguage || 'English').trim();
  const level = String(req.body?.level || req.authenticatedUser.level || 'Beginner').trim();

  try {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId,
      topic,
      language,
      level,
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      messages: []
    };

    const greeting = await generateAiResponse({
      topic,
      language,
      proficiencyLevel: level,
      messages: []
    });

    const aiMessage = {
      role: 'assistant',
      content: greeting,
      timestamp: new Date().toISOString()
    };
    session.messages.push(aiMessage);
    AI_SESSIONS.set(sessionId, session);

    res.status(201).json({
      success: true,
      sessionId,
      conversationId: sessionId,
      topic,
      language,
      level,
      partnerName: 'BYTALK AI Partner',
      message: aiMessage,
      response: greeting
    });
  } catch (error) {
    const status = error.status || (error.code === 'ai_provider_unavailable' ? 503 : 502);
    res.status(status).json({
      success: false,
      error: error.message || 'Could not start AI practice session.',
      code: error.code || 'ai_provider_error'
    });
  }
});

/**
 * POST /api/practice/ai/:sessionId/messages
 * Sends a message to the active session and returns the AI response.
 */
app.post('/api/practice/ai/:sessionId/messages', requireAuth, async (req, res) => {
  const userId = String(req.authenticatedUser.id);
  const session = AI_SESSIONS.get(req.params.sessionId);
  const text = typeof req.body?.text === 'string'
    ? req.body.text.trim()
    : typeof req.body?.message === 'string'
      ? req.body.message.trim()
      : '';

  if (!session || session.userId !== userId) {
    return res.status(404).json({ error: 'Practice session not found.' });
  }
  if (!text || text.length > 1500) {
    return res.status(400).json({ error: 'Enter a message up to 1500 characters.' });
  }
  if (!enforceAiRateLimit(userId, req.authenticatedUser)) {
    return res.status(429).json({ error: 'AI practice rate limit reached. Try again shortly.' });
  }

  try {
    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    session.messages.push(userMessage);
    session.lastActiveAt = Date.now();

    const reply = await generateAiResponse({
      topic: session.topic,
      language: session.language,
      proficiencyLevel: session.level,
      messages: session.messages
    });

    const aiMessage = {
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString()
    };
    session.messages.push(aiMessage);

    res.json({
      success: true,
      message: aiMessage,
      response: reply
    });
  } catch (error) {
    session.messages.pop();
    const status = error.status || (error.code === 'ai_provider_unavailable' ? 503 : 502);
    res.status(status).json({
      success: false,
      error: error.message || 'The AI conversation partner could not respond.',
      code: error.code || 'ai_provider_error'
    });
  }
});

/**
 * POST /api/practice/ai/:sessionId/end
 * Concludes the AI practice session and saves record to PracticeSession collection.
 */
app.post('/api/practice/ai/:sessionId/end', requireAuth, async (req, res) => {
  const userId = String(req.authenticatedUser.id);
  const session = AI_SESSIONS.get(req.params.sessionId);
  if (!session || session.userId !== userId) {
    return res.status(404).json({ error: 'Practice session not found.' });
  }

  AI_SESSIONS.delete(req.params.sessionId);
  const endedAt = Date.now();
  const durationSeconds = Math.max(0, Math.floor((endedAt - session.startedAt) / 1000));
  const messageCount = session.messages.length;

  try {
    const saved = await PracticeSession.create({
      userId: session.userId,
      mode: 'ai',
      topic: session.topic,
      language: session.language || 'English',
      level: session.level || 'Beginner',
      startedAt: new Date(session.startedAt),
      endedAt: new Date(endedAt),
      durationSeconds,
      messageCount,
      rating: Number(req.body?.rating) || undefined,
      feedback: typeof req.body?.feedback === 'string' ? req.body.feedback.trim() : undefined
    });

    res.json({
      ok: true,
      sessionId: session.id,
      durationSeconds,
      messageCount,
      endedAt: new Date(endedAt).toISOString(),
      practiceSessionId: saved._id
    });
  } catch (error) {
    console.error(`AI practice session persistence failed: ${error.message}`);
    res.json({
      ok: true,
      sessionId: session.id,
      durationSeconds,
      messageCount,
      endedAt: new Date(endedAt).toISOString()
    });
  }
});

/**
 * POST /api/practice/ai/:sessionId/feedback
 * Allows user to submit 1-5 star rating and optional feedback comment.
 */
app.post('/api/practice/ai/:sessionId/feedback', requireAuth, async (req, res) => {
  const userId = String(req.authenticatedUser.id);
  const { rating, feedback, comment } = req.body || {};
  const feedbackText = (feedback || comment || '').trim();
  const ratingNum = Number(rating);

  try {
    await PracticeSession.findOneAndUpdate(
      { userId, mode: 'ai' },
      {
        $set: {
          ...(ratingNum ? { rating: ratingNum } : {}),
          ...(feedbackText ? { feedback: feedbackText } : {})
        }
      },
      { sort: { createdAt: -1 } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not save feedback.' });
  }
});

app.get('/api/subscription/plans', async (req, res) => {
  try {
    const plans = await getActivePlans();
    res.json(plans);
  } catch (err) {
    res.json(DEFAULT_PRO_PLANS);
  }
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

// RAZORPAY SUBSCRIPTION INTEGRATION
app.get('/api/subscription/razorpay/config', (req, res) => {
  res.json({
    enabled: RAZORPAY_AVAILABLE,
    keyId: RAZORPAY_KEY_ID,
  });
});

app.post('/api/subscription/razorpay/create-order', requireAuth, async (req, res) => {
  try {
    if (!RAZORPAY_AVAILABLE) {
      return res.status(503).json({ error: 'Razorpay is not configured on this server.' });
    }
    const user = await User.findById(req.authenticatedUser.id);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { planId = '3months', amount, duration = '3 Months', coupon } = req.body || {};

    const plan = await Plan.findOne({ id: planId }).lean();
    let finalAmountRupees = Number(amount);
    if (!finalAmountRupees || finalAmountRupees <= 0) {
      if (plan) {
        finalAmountRupees = coupon === 'SALE25'
          ? Math.round(plan.price * 0.75 * 10) / 10
          : plan.price;
      } else if (planId === '1year') finalAmountRupees = 1049.25;
      else if (planId === '1month') finalAmountRupees = 299.25;
      else finalAmountRupees = 524.30;
    }
    finalAmountRupees = Math.max(1, finalAmountRupees);
    const amountInPaise = Math.max(100, Math.round(finalAmountRupees * 100));

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const receiptId = `sub_${String(user._id).slice(-6)}_${Date.now().toString().slice(-6)}`;

    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          userId: String(user._id),
          email: user.email,
          name: user.name,
          planId,
          duration,
        },
      }),
    });

    const orderData = await rzpResponse.json();
    if (!rzpResponse.ok || orderData.error) {
      console.error('[Razorpay Order Error]', orderData);
      return res.status(rzpResponse.status || 500).json({
        error: orderData.error?.description || 'Failed to create Razorpay order',
      });
    }

    console.log(`Razorpay order created: ${orderData.id} for user ${user._id} (${duration} - ₹${finalAmountRupees})`);

    res.json({
      ok: true,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: RAZORPAY_KEY_ID,
      receipt: receiptId,
      user: {
        name: user.displayName || user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[Razorpay Create Order Exception]', error);
    res.status(500).json({ error: error.message || 'Could not initiate Razorpay order' });
  }
});

app.post('/api/subscription/razorpay/verify-payment', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId = '3months' } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification parameters.' });
    }

    // Verify HMAC SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn(`[Razorpay Signature Mismatch] expected ${generatedSignature}, got ${razorpay_signature}`);
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const user = await User.findById(req.authenticatedUser.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Calculate subscription duration based on dynamic plan or fallback
    const plan = await Plan.findOne({ id: planId }).lean();
    const days = plan?.durationDays || (planId === '1year' ? 365 : planId === '1month' ? 30 : 90);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const amountPaid = Number(req.body.amount) || (plan?.price ? Math.round(plan.price * 0.75 * 10) / 10 : 524.3);
    const durationLabel = req.body.duration || plan?.duration || plan?.name || (days >= 365 ? '1 Year' : days >= 90 ? '3 Months' : '1 Month');

    user.subscriptionPlan = 'pro';
    user.subscriptionStatus = 'active';
    user.subscriptionProvider = 'razorpay';
    user.subscriptionProviderCustomerId = String(user._id);
    user.subscriptionProviderPurchaseId = razorpay_payment_id;
    user.subscriptionEntitlementId = `bytalk_pro_${planId}`;
    user.subscriptionStartedAt = now;
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionRenewalStatus = 'not_renewing';
    user.subscriptionAmount = amountPaid;
    user.subscriptionDuration = durationLabel;
    await user.save();

    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: user.email || user.name,
      eventType: 'PRO_SUBSCRIPTION_PURCHASED',
      target: `${durationLabel} - ₹${amountPaid} (Razorpay: ${razorpay_payment_id})`,
    });

    try {
      await SubscriptionEvent.create({
        eventId: razorpay_payment_id,
        provider: 'razorpay',
        userId: String(user._id),
      });
    } catch {}

    store.users = (await User.find().lean()).map(cacheUser);
    console.log(`[Razorpay Payment Verified] User ${user.email} is now PRO until ${expiresAt.toISOString()}`);

    // Notify connected client in real-time over WebSocket
    emitToUser(String(user._id), 'subscription:updated', {
      plan: { id: 'pro', name: durationLabel },
      status: 'active',
      expiresAt: expiresAt.toISOString(),
      subscription: entitlementPayload(user),
      message: `🎉 Payment confirmed! Your BYTALK PRO subscription (${durationLabel}) is active. All PRO features are now unlocked!`,
    });

    res.json({
      ok: true,
      success: true,
      plan: 'pro',
      status: 'active',
      expiresAt: expiresAt.toISOString(),
      user: sanitizeUser(user),
      subscription: entitlementPayload(user),
    });
  } catch (error) {
    console.error('[Razorpay Verify Error]', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

app.get('/api/subscription/razorpay/checkout-page', async (req, res) => {
  const { orderId, amount, name, email, planId = '3months', token } = req.query;
  if (!orderId) return res.status(400).send('Missing orderId');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>BYTALK PRO Checkout</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #0B0F19;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      text-align: center;
    }
    .card {
      background: #1A1D2E;
      border: 1px solid #374151;
      border-radius: 16px;
      padding: 28px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .badge {
      background: #FEF3C7;
      color: #D97706;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 12px;
    }
    .price {
      font-size: 32px;
      font-weight: 800;
      color: #FBBF24;
      margin: 10px 0;
    }
    .btn {
      background: #5843E8;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      margin-top: 20px;
      transition: background 0.2s;
    }
    .btn:hover { background: #4732D6; }
    .footer {
      margin-top: 16px;
      font-size: 12px;
      color: #9CA3AF;
    }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card">
    <div class="badge">👑 FESTIVE PRO OFFER</div>
    <h2 style="margin: 0 0 6px 0;">BYTALK PRO</h2>
    <div style="color: #9CA3AF; font-size: 14px;">Unlock Unlimited ARYA AI & Video Calls</div>
    <div class="price">₹${(Number(amount) / 100).toFixed(2)}</div>
    <button id="pay-btn" class="btn">Pay Securely with Razorpay</button>
    <div class="footer">🔒 100% Secure • Powered by Razorpay</div>
  </div>

  <script>
    function openRazorpay() {
      const options = {
        key: '${RAZORPAY_KEY_ID}',
        amount: ${amount},
        currency: 'INR',
        name: 'BYTALK',
        description: 'BYTALK PRO Subscription',
        order_id: '${orderId}',
        prefill: {
          name: ${JSON.stringify(name || 'BYTALK Learner')},
          email: ${JSON.stringify(email || '')}
        },
        theme: {
          color: '#5843E8'
        },
        handler: function (response) {
          document.body.innerHTML = '<div class="card"><h2>Verifying Payment...</h2><p>Please wait while we activate your PRO account.</p></div>';
          fetch('/api/subscription/razorpay/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${token}'
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: '${planId}'
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.ok || data.success) {
              const returnUrl = ${JSON.stringify(req.query.redirectUrl || 'http://localhost:8081')};
              document.body.innerHTML = '<div class="card"><h1 style="font-size: 54px; margin: 0 0 10px 0;">🎉</h1><h2 style="color: #10B981; margin: 0 0 8px 0;">PRO Activated!</h2><p style="color: #E2E8F0; font-size: 15px; margin: 0 0 16px 0;">Your payment was verified. All PRO features are now active!</p><p style="color: #9CA3AF; font-size: 13px; margin-bottom: 20px;">Redirecting you back to BYTALK...</p><a href="' + returnUrl + '" class="btn" style="text-decoration: none; display: inline-block;">Return to BYTALK Now</a></div>';
              setTimeout(function() {
                try { window.location.href = returnUrl; } catch(e) {}
              }, 1600);
            } else {
              document.body.innerHTML = '<div class="card"><h2 style="color: #EF4444;">Verification Issue</h2><p>' + (data.error || 'Please contact support.') + '</p></div>';
            }
          })
          .catch(err => {
            document.body.innerHTML = '<div class="card"><h2 style="color: #EF4444;">Error</h2><p>' + err.message + '</p></div>';
          });
        },
        modal: {
          ondismiss: function() {
            console.log('Checkout dismissed');
          }
        }
      };
      const rzp = new Razorpay(options);
      rzp.open();
    }

    document.getElementById('pay-btn').onclick = openRazorpay;
    window.onload = function() {
      setTimeout(openRazorpay, 500);
    };
  </script>
</body>
</html>`;

  res.send(html);
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
app.get('/api/users', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return requireAuth(req, res, async () => {
      const users = await User.find({ _id: { $ne: req.authenticatedUser._id } }).lean();
      store.users = (await User.find().lean()).map(cacheUser);
      res.json(users.map(publicUser));
    });
  }

  // Admin / internal request without user JWT: return full user list with subscription details
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    store.users = users.map(cacheUser);
    res.json(users.map((u) => ({
      id: String(u._id),
      name: u.name,
      alias: u.displayName || u.name,
      email: u.email,
      country: u.country || 'Global',
      nativeLanguage: u.nativeLanguage || 'English',
      learningLanguage: u.learningLanguage || 'English',
      level: u.level || 'Beginner',
      status: u.status || 'active',
      online: store.users.find((su) => String(su.id) === String(u._id))?.online || false,
      subscriptionPlan: u.subscriptionPlan || 'free',
      subscriptionStatus: u.subscriptionStatus || 'inactive',
      subscriptionExpiresAt: u.subscriptionExpiresAt,
      subscriptionStartedAt: u.subscriptionStartedAt,
      subscriptionProviderPurchaseId: u.subscriptionProviderPurchaseId,
      subscriptionAmount: u.subscriptionAmount || 0,
      subscriptionDuration: u.subscriptionDuration || (u.subscriptionPlan === 'pro' ? 'PRO Plan' : null),
      createdAt: u.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function listDiscoverUsers(req, res) {
  const currentUserId = req.authenticatedUser.id;
  const currentUser = await User.findById(currentUserId).lean();
  const q = String(req.query.q || '').toLowerCase();
  const topic = String(req.query.topic || 'All Topics');
  const practiceOnly = req.query.practiceOnly === 'true';
  if (!PRACTICE_TOPICS.includes(topic)) {
    return res.status(400).json({ error: 'Invalid practice topic.' });
  }
  const blockedUsers = currentUser?.blockedUsers || [];
  const eligibleQuery = { _id: { $ne: currentUserId, $nin: blockedUsers } };
  const eligibleCount = await User.countDocuments(eligibleQuery);
  const mongoUsers = await User.find({
    _id: { $ne: currentUserId, $nin: blockedUsers },
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
    .filter((user) => (!practiceOnly || user.online) && [user.displayName, user.country, ...user.languages, user.level]
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
app.get('/api/practice/partners', requireAuth, (req, res) => {
  req.query.practiceOnly = 'true';
  return listDiscoverUsers(req, res);
});

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
  const recipient = await User.findById(to).select('blockedUsers').lean();
  if (recipient?.blockedUsers?.includes(String(senderId)) || req.authenticatedUser.blockedUsers?.includes(to)) {
    return res.status(403).json({ error: 'Messaging is unavailable for this user.' });
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

app.get('/api/calls', requireAuth, async (req, res) => {
  const currentUserId = String(req.authenticatedUser.id);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const calls = await CallHistory.find({
    $or: [{ callerId: currentUserId }, { calleeId: currentUserId }],
    createdAt: { $gte: cutoff },
  }).sort({ createdAt: -1 }).limit(100).lean();
  const participantIds = [...new Set(calls.map((call) => (
    call.callerId === currentUserId ? call.calleeId : call.callerId
  )))];
  const participantUsers = await User.find({ _id: { $in: participantIds } }).lean();
  const usersById = new Map(participantUsers.map((user) => [String(user._id), user]));
  res.json(calls.map((call) => {
    const participantId = call.callerId === currentUserId ? call.calleeId : call.callerId;
    const participant = usersById.get(participantId);
    return {
      id: call.callId,
      callId: call.callId,
      callerId: call.callerId,
      calleeId: call.calleeId,
      type: call.type,
      status: call.status,
      createdAt: call.createdAt,
      connectedAt: call.connectedAt,
      endedAt: call.endedAt,
      durationSeconds: call.durationSeconds,
      participant: participant ? {
        id: participantId,
        name: participant.name,
        profilePhotoUrl: participant.profilePhotoUrl || null,
      } : { id: participantId, name: 'BYTALK user', profilePhotoUrl: null },
    };
  }));
});

app.post('/api/calls/:callId/feedback', requireAuth, async (req, res) => {
  const currentUserId = String(req.authenticatedUser.id);
  const rating = Number(req.body?.rating);
  const tags = Array.isArray(req.body?.tags)
    ? [...new Set(req.body.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))].slice(0, 8)
    : [];
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer from 1 to 5.' });
  }
  if (comment.length > 1000) return res.status(400).json({ error: 'Feedback is too long.' });

  const call = await CallHistory.findOne({
    callId: req.params.callId,
    $or: [{ callerId: currentUserId }, { calleeId: currentUserId }],
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).select('_id feedback');
  if (!call) return res.status(404).json({ error: 'Call history record not found.' });

  const result = await CallHistory.updateOne(
    { _id: call._id, 'feedback.userId': { $ne: currentUserId } },
    { $push: { feedback: { userId: currentUserId, rating, tags, comment } } }
  );
  if (!result.modifiedCount) return res.status(409).json({ error: 'Feedback has already been submitted for this call.' });
  return res.status(201).json({ ok: true });
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

app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = store.users.filter((x) => x.online).length;
    const proUsers = await User.countDocuments({ subscriptionPlan: { $in: ['pro', 'plus'] } });
    const freeUsers = Math.max(0, totalUsers - proUsers);

    // Calculate total revenue from subscriptions
    const paidUsers = await User.find({ subscriptionAmount: { $gt: 0 } }).select('subscriptionAmount');
    const totalRevenue = paidUsers.reduce((sum, u) => sum + (Number(u.subscriptionAmount) || 0), 0);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: oneDayAgo } });
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.json({
      users: totalUsers || store.users.length,
      activeUsers,
      proUsers,
      freeUsers,
      totalRevenue: Math.round(totalRevenue * 10) / 10,
      rooms: store.rooms.length,
      messages: store.messages.length,
      reports: store.reports.filter((r) => r.status === 'open').length,
      newUsersToday,
      newUsersThisWeek,
    });
  } catch (err) {
    res.json({
      users: store.users.length,
      activeUsers: store.users.filter((x) => x.online).length,
      proUsers: 0,
      freeUsers: store.users.length,
      totalRevenue: 0,
      rooms: store.rooms.length,
      messages: store.messages.length,
      reports: store.reports.filter((r) => r.status === 'open').length,
      newUsersToday: 0,
      newUsersThisWeek: 0,
    });
  }
});

// ADMIN API ENDPOINTS
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json(users.map((u) => ({
      id: String(u._id),
      name: u.name,
      alias: u.displayName || u.name,
      email: u.email,
      country: u.country || 'Global',
      nativeLanguage: u.nativeLanguage || 'English',
      learningLanguage: u.learningLanguage || 'English',
      level: u.level || 'Beginner',
      status: u.status || 'active',
      online: store.users.find((su) => String(su.id) === String(u._id))?.online || false,
      subscriptionPlan: u.subscriptionPlan || 'free',
      subscriptionStatus: u.subscriptionStatus || 'inactive',
      subscriptionExpiresAt: u.subscriptionExpiresAt,
      subscriptionStartedAt: u.subscriptionStartedAt,
      subscriptionProviderPurchaseId: u.subscriptionProviderPurchaseId,
      subscriptionAmount: u.subscriptionAmount || 0,
      subscriptionDuration: u.subscriptionDuration || (u.subscriptionPlan === 'pro' ? 'PRO Plan' : null),
      falseReportCount: u.falseReportCount || 0,
      createdAt: u.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users/:userId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const user = await User.findByIdAndUpdate(req.params.userId, { status }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin',
      eventType: status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
      target: `${user.name} (${user.email})`,
    });

    // Notify connected client in real-time
    emitToUser(String(user._id), 'user:status_updated', {
      status: user.status,
      message: status === 'suspended'
        ? 'Your account has been suspended by administration.'
        : 'Your account has been reactivated by administration.',
    });

    res.json({ ok: true, user: { id: String(user._id), status: user.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/subscriptions', async (req, res) => {
  try {
    const subscribers = await User.find({
      $or: [
        { subscriptionPlan: { $in: ['pro', 'plus'] } },
        { subscriptionProviderPurchaseId: { $ne: null } },
        { subscriptionAmount: { $gt: 0 } },
      ],
    }).sort({ subscriptionStartedAt: -1, updatedAt: -1 }).lean();

    const list = subscribers.map((u) => {
      const isStillActive = u.subscriptionStatus === 'active' && (!u.subscriptionExpiresAt || new Date(u.subscriptionExpiresAt) > new Date());
      return {
        id: `sub-${u._id}`,
        userId: String(u._id),
        userName: u.name,
        userEmail: u.email,
        plan: u.subscriptionDuration || (u.subscriptionPlan === 'pro' ? '3 Months' : 'BYTALK Pro'),
        planId: u.subscriptionPlan || 'pro',
        provider: u.subscriptionProvider || 'razorpay',
        purchaseId: u.subscriptionProviderPurchaseId || `sub_${String(u._id).slice(-8)}`,
        amount: u.subscriptionAmount || (u.subscriptionPlan === 'pro' ? 524.3 : 399),
        startedAt: u.subscriptionStartedAt || u.createdAt,
        expiresAt: u.subscriptionExpiresAt,
        status: isStillActive ? 'active' : 'expired',
      };
    });

    res.json({ subscriptions: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/subscriptions/grant', async (req, res) => {
  try {
    const { userId, planId = '3months', durationDays = 90, amount = 0, notes = '' } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const plan = planId ? await Plan.findOne({ id: planId }).lean() : null;
    const days = Number(durationDays) || plan?.durationDays || 90;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const durationLabel = plan?.duration || plan?.name || (days >= 365 ? '1 Year' : days >= 90 ? '3 Months' : '1 Month');

    user.subscriptionPlan = 'pro';
    user.subscriptionStatus = 'active';
    user.subscriptionProvider = 'admin_grant';
    user.subscriptionStartedAt = now;
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionDuration = durationLabel;
    user.subscriptionAmount = Number(amount) || 0;
    user.subscriptionProviderPurchaseId = `adm_${Date.now()}`;
    await user.save();

    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin',
      eventType: 'PRO_GRANTED_BY_ADMIN',
      target: `${user.name} (${user.email}) - ${durationLabel} until ${expiresAt.toLocaleDateString()}`,
    });

    store.users = (await User.find().lean()).map(cacheUser);

    // Notify connected user app in real-time
    emitToUser(String(user._id), 'subscription:updated', {
      plan: { id: 'pro', name: durationLabel },
      status: 'active',
      expiresAt: expiresAt.toISOString(),
      subscription: entitlementPayload(user),
      message: `🎉 Great news! Your account has been upgraded to BYTALK PRO (${durationLabel}) by administration! All PRO features are now active.`,
    });

    res.json({ ok: true, user: { id: String(user._id), subscriptionPlan: 'pro', subscriptionExpiresAt: expiresAt } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/subscriptions/revoke', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.subscriptionPlan = 'free';
    user.subscriptionStatus = 'inactive';
    user.subscriptionExpiresAt = null;
    await user.save();

    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin',
      eventType: 'PRO_REVOKED_BY_ADMIN',
      target: `${user.name} (${user.email})`,
    });

    store.users = (await User.find().lean()).map(cacheUser);

    // Notify connected user app in real-time
    emitToUser(String(user._id), 'subscription:updated', {
      plan: { id: 'free', name: 'Free' },
      status: 'inactive',
      expiresAt: null,
      subscription: entitlementPayload(user),
      message: 'Your BYTALK subscription plan has been set to Free by administration.',
    });

    res.json({ ok: true, user: { id: String(user._id), subscriptionPlan: 'free' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: SUBSCRIPTION PLANS CRUD (Add, Edit, Update, Delete)
app.get('/api/admin/plans', async (req, res) => {
  try {
    const plans = await getAllPlans();
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/plans', async (req, res) => {
  try {
    const {
      id,
      name,
      duration,
      durationDays = 30,
      price,
      originalPrice = 0,
      savings = '',
      badge = null,
      badgeColor = '#EA580C',
      badgeBg = '#FFEDD5',
      unitText = '',
      features = [],
      order = 0,
      active = true,
    } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Plan name is required.' });
    }
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: 'Valid plan price in INR is required.' });
    }

    const cleanId = (id && String(id).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')) ||
      name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') ||
      `plan_${Date.now()}`;

    const existing = await Plan.findOne({ id: cleanId });
    if (existing) {
      return res.status(409).json({ error: `A plan with ID "${cleanId}" already exists.` });
    }

    const durationLabel = (duration && String(duration).trim()) || name.trim();
    const days = Math.max(1, Number(durationDays) || 30);
    const finalPrice = Number(price);
    const origPrice = Number(originalPrice) || Math.round(finalPrice * 1.5);
    const finalSavings = savings ? String(savings).trim() : (origPrice > finalPrice ? `Save ${Math.round((1 - finalPrice / origPrice) * 100)}%` : '');

    const newPlan = new Plan({
      id: cleanId,
      name: name.trim(),
      duration: durationLabel,
      durationDays: days,
      price: finalPrice,
      originalPrice: origPrice,
      savings: finalSavings,
      badge: badge ? String(badge).trim() : null,
      badgeColor: badgeColor || '#EA580C',
      badgeBg: badgeBg || '#FFEDD5',
      unitText: unitText ? String(unitText).trim() : `/${durationLabel}`,
      features: Array.isArray(features) && features.length > 0 ? features : [
        'Unlimited ARYA AI practice conversations',
        'HD 1-on-1 Video Calling',
        'All interview & daily conversation topics',
        'Priority matching with global speakers',
        'One-time payment, no autopay',
      ],
      order: Number(order) || (await Plan.countDocuments()) + 1,
      active: active !== false,
    });

    await newPlan.save();

    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin',
      eventType: 'PLAN_CREATED',
      target: `${newPlan.name} (${newPlan.id}) - ₹${newPlan.price} / ${newPlan.duration}`,
    });

    // Notify all connected mobile clients in real-time
    io.emit('subscription:plans_updated', {
      action: 'created',
      plan: newPlan,
      plans: await getActivePlans(),
    });

    res.status(201).json({ ok: true, plan: newPlan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const body = req.body || {};
    const updateData = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.duration !== undefined) updateData.duration = String(body.duration).trim();
    if (body.durationDays !== undefined) updateData.durationDays = Math.max(1, Number(body.durationDays) || 30);
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.originalPrice !== undefined) updateData.originalPrice = Number(body.originalPrice);
    if (body.savings !== undefined) updateData.savings = String(body.savings).trim();
    if (body.badge !== undefined) updateData.badge = body.badge ? String(body.badge).trim() : null;
    if (body.badgeColor !== undefined) updateData.badgeColor = String(body.badgeColor).trim();
    if (body.badgeBg !== undefined) updateData.badgeBg = String(body.badgeBg).trim();
    if (body.unitText !== undefined) updateData.unitText = String(body.unitText).trim();
    if (Array.isArray(body.features)) updateData.features = body.features;
    if (body.order !== undefined) updateData.order = Number(body.order);
    if (body.active !== undefined) updateData.active = Boolean(body.active);

    const updated = await Plan.findOneAndUpdate(
      { id: planId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin',
      eventType: 'PLAN_UPDATED',
      target: `${updated.name} (${updated.id}) - ₹${updated.price} / ${updated.duration}`,
    });

    // Notify connected mobile clients
    io.emit('subscription:plans_updated', {
      action: 'updated',
      plan: updated,
      plans: await getActivePlans(),
    });

    res.json({ ok: true, plan: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const deleted = await Plan.findOneAndDelete({ id: planId });
    if (!deleted) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Admin',
      eventType: 'PLAN_DELETED',
      target: `${deleted.name} (${deleted.id})`,
    });

    // Notify connected mobile clients
    io.emit('subscription:plans_updated', {
      action: 'deleted',
      planId,
      plans: await getActivePlans(),
    });

    res.json({ ok: true, message: `Plan "${deleted.name}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/audit', (req, res) => {
  res.json({ auditLogs });
});

app.get('/api/reports', (req, res) => res.json(store.reports));

app.post('/api/reports', (req, res) => {
  const { reason, reportedUserId, reporterId } = req.body;
  if (typeof reason !== 'string' || !reason.trim()) return res.status(400).json({ error: 'Reason required' });
  const report = {
    id: crypto.randomUUID(),
    reason: reason.slice(0, 500),
    reportedUserId: reportedUserId || null,
    reporterId: reporterId || null,
    status: 'open',
    verificationStatus: 'verified',
    at: new Date().toISOString(),
  };
  store.reports.push(report);
  save();
  res.status(201).json(report);
});

app.patch('/api/reports/:id', async (req, res) => {
  const report = store.reports.find((r) => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  const { status, moderatorNotes } = req.body;
  if (!['open', 'resolved', 'dismissed_as_false'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  report.status = status;
  if (moderatorNotes) report.moderatorNotes = moderatorNotes;

  if (status === 'dismissed_as_false' && report.reporterId) {
    try {
      await User.findByIdAndUpdate(report.reporterId, { $inc: { falseReportCount: 1 } });
    } catch {}
  }

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: 'Moderator',
    eventType: status === 'dismissed_as_false' ? 'REPORT_FALSE_PENALIZED' : 'REPORT_RESOLVED',
    target: `Report ${report.id.slice(0, 8)} (${report.reason})`,
  });

  save();
  res.json(report);
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const decoded = verifyToken(token);
    let user = store.users.find((item) => String(item.id) === String(decoded.userId));
    if (!user && decoded.userId) {
      try {
        const dbUser = await User.findById(decoded.userId).lean();
        if (dbUser) {
          user = cacheUser(dbUser);
          store.users.push(user);
        }
      } catch {}
    }
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
    let targetUser = store.users.find((user) => String(user.id) === String(to));
    if (!targetUser) {
      try {
        const dbUser = await User.findById(to).lean();
        if (dbUser) {
          targetUser = cacheUser(dbUser);
          store.users.push(targetUser);
        }
      } catch {}
    }
    if (!targetUser) {
      acknowledge({ error: 'User not found' });
      return;
    }
    const [callerBlockState, recipientBlockState] = await Promise.all([
      User.findById(userId).select('blockedUsers').lean(),
      User.findById(to).select('blockedUsers').lean(),
    ]);
    if (callerBlockState?.blockedUsers?.includes(to) || recipientBlockState?.blockedUsers?.includes(userId)) {
      acknowledge({ error: 'Calling is unavailable for this user.' });
      return;
    }
    if (!(userSockets.get(String(to))?.size || 0)) {
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

    let caller = store.users.find((user) => String(user.id) === String(userId));
    if (!caller) {
      try {
        const dbCaller = await User.findById(userId).lean();
        if (dbCaller) {
          caller = cacheUser(dbCaller);
          store.users.push(caller);
        }
      } catch {}
    }
    emitToUser(to, 'call:incoming', {
      callId: call.id,
      type,
      createdAt,
      restricted: restrictedForRecipient,
      restrictionReason: restrictedForRecipient ? 'A BYTALK Plus or Pro subscription is required to accept video calls.' : null,
      caller: sanitizeUser(caller) || { id: userId, name: 'BYTALK User' },
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
      if (!caller || !callee || (!canUseVideo(caller) && !canUseVideo(callee))) {
        acknowledge({ error: 'Video calling requires an active PRO subscription.', code: 'video_plan_required' });
        emitToUser(call.callerId, 'call:ended', { callId: call.id, status: 'restricted', reason: 'video_plan_required' });
        finishCall(call, 'restricted', userId);
        return;
      }
      resetUsageIfNeeded(caller);
      resetUsageIfNeeded(callee);
      if (canUseVideo(caller)) caller.videoCallsUsed += 1;
      if (canUseVideo(callee)) callee.videoCallsUsed += 1;
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

  socket.on('call:end', async ({ callId } = {}, acknowledge = () => {}) => {
    const call = activeCalls.get(callId);
    if (!call || !participantForCall(call, userId)) {
      acknowledge({ error: 'This call is no longer available' });
      return;
    }
    try {
      await finishCall(call, call.status === 'ringing' ? 'cancelled' : 'ended', userId);
    } catch {
      acknowledge({ error: 'Call ended, but history could not be saved.' });
      return;
    }
    const ended = {
      callId,
      status: call.status,
      endedBy: userId,
      endedAt: call.endedAt,
      connectedAt: call.connectedAt || null,
      durationSeconds: call.durationSeconds,
      type: call.type,
    };
    emitToUser(call.callerId, 'call:ended', ended);
    emitToUser(call.calleeId, 'call:ended', ended);
    acknowledge({ ok: true, call: ended });
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

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[BYTALK backend error] Port ${port} is already in use by another process.`);
    console.error(`To free port ${port} in PowerShell, run:`);
    console.error(`  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -Force\n`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(port, '0.0.0.0', () => console.log(`BYTALK backend running on http://localhost:${port}`));
