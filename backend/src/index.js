import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = path.join(root, 'data', 'store.json');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

// Environment configuration
const JWT_SECRET = process.env.JWT_SECRET || 'bytalk_production_secure_jwt_secret_key_change_in_prod_15d';
const FIFTEEN_DAYS_SECONDS = 15 * 24 * 60 * 60; // 15 days in seconds

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
  const { passwordHash, ...safe } = user;
  return safe;
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

const save = () => fs.writeFileSync(dbFile, JSON.stringify(store, null, 2));

const app = express();
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
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

// Health check endpoints
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'BYTALK API', time: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ ok: true, service: 'BYTALK API', time: new Date().toISOString() }));

// AUTHENTICATION: REGISTER
app.post('/api/register', (req, res) => {
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

  // Check if email already registered
  const existing = store.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const newUser = {
    id: `u_${crypto.randomUUID().slice(0, 8)}`,
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
  };

  store.users.push(newUser);
  save();

  // Issue 15-day JWT token
  const token = signToken({ userId: newUser.id, email: newUser.email }, { expiresIn: '15d' });
  res.status(201).json({ ok: true, user: sanitizeUser(newUser), token });
});

// AUTHENTICATION: LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = store.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  user.online = true;
  save();

  // Issue 15-day JWT token
  const token = signToken({ userId: user.id, email: user.email }, { expiresIn: '15d' });
  res.json({ ok: true, user: sanitizeUser(user), token });
});

// AUTHENTICATION: VALIDATE SESSION / GET CURRENT USER
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  const token = authHeader.slice(7).trim();
  try {
    const decoded = verifyToken(token);
    const user = store.users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User session not found or account removed' });
    }
    return res.json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Invalid or expired session token' });
  }
});

// USERS & PARTNERS
app.get('/api/users', (req, res) => res.json(store.users.map(sanitizeUser)));

app.get('/api/partners', (req, res) => {
  const currentUserId = req.user?.userId || 'u1';
  const q = String(req.query.q || '').toLowerCase();
  res.json(
    store.users
      .filter((u) => u.id !== currentUserId && [u.name, u.country, u.nativeLanguage, u.level].some((x) => String(x || '').toLowerCase().includes(q)))
      .map(sanitizeUser)
  );
});

app.post('/api/onboard', (req, res) => {
  const { name, country, nativeLanguage, learningLanguage, level } = req.body;
  const currentUserId = req.user?.userId || 'u1';
  let me = store.users.find((u) => u.id === currentUserId) || store.users.find((u) => u.id === 'u1');
  if (me) {
    for (const [k, v] of Object.entries({ name, country, nativeLanguage, learningLanguage, level })) {
      if (typeof v === 'string' && v.trim()) me[k] = v.trim().slice(0, 80);
    }
    save();
    return res.json(sanitizeUser(me));
  }
  res.status(404).json({ error: 'User not found' });
});

app.get('/api/rooms', (req, res) => res.json(store.rooms));

app.post('/api/rooms/:id/join', (req, res) => {
  const room = store.rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  room.joined++;
  save();
  io.emit('rooms:changed', store.rooms);
  res.json(room);
});

app.get('/api/messages/:a/:b', (req, res) =>
  res.json(store.messages.filter((m) => (m.from === req.params.a && m.to === req.params.b) || (m.from === req.params.b && m.to === req.params.a)))
);

app.post('/api/messages', (req, res) => {
  const { from, to, text } = req.body;
  const senderId = req.user?.userId || from;
  if (!store.users.some((u) => u.id === senderId) || !store.users.some((u) => u.id === to) || typeof text !== 'string' || !text.trim() || text.length > 1500) {
    return res.status(400).json({ error: 'Invalid message' });
  }
  const msg = { id: crypto.randomUUID(), from: senderId, to, text: text.trim(), at: new Date().toISOString() };
  store.messages.push(msg);
  save();
  io.emit('message:new', msg);
  res.status(201).json(msg);
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

io.on('connection', (socket) => {
  socket.on('ping:app', () => socket.emit('pong:app'));
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, '0.0.0.0', () => console.log(`BYTALK backend running on http://localhost:${port}`));
