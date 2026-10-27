// Comprehensive End-to-End Test Suite for BYTALK
// Tests all REST endpoints and Socket.IO signaling events

import http from 'http';
import { io as ClientIO } from '../mobile/node_modules/socket.io-client/build/esm/index.js';

const BASE_URL = 'http://localhost:4000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('--- STARTING BYTALK COMPREHENSIVE TEST SUITE ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${extra}`);
      failed++;
    }
  }

  // 1. Health & Welcome
  const health = await request('/api/health');
  assert(health.ok && health.data.ok === true, 'GET /api/health');

  const root = await request('/');
  assert(root.ok && root.data.service === 'BYTALK Backend API', 'GET / (Service Discovery)');

  // 2. Authentication (Register & Login)
  const testEmail = `test_${Date.now()}@bytalk.app`;
  const reg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Tester',
      email: testEmail,
      password: 'password123',
      country: 'India',
      level: 'Intermediate'
    })
  });
  assert(reg.status === 201 && reg.data.token, 'POST /auth/register', JSON.stringify(reg.data));
  const token = reg.data.token;
  const testUserId = reg.data.user?.id;

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testEmail, password: 'password123' })
  });
  assert(login.ok && login.data.token, 'POST /auth/login', JSON.stringify(login.data));

  // 3. User Profile & Directory
  const me = await request('/me', { headers: { Authorization: `Bearer ${token}` } });
  assert(me.ok && me.data.user?.id === testUserId, 'GET /me (Authenticated Profile)');

  const updateProfile = await request('/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ alias: 'SuperTester' })
  });
  assert(updateProfile.ok && updateProfile.data.user?.alias === 'SuperTester', 'PATCH /me');

  const users = await request('/api/users');
  assert(users.ok && Array.isArray(users.data) && users.data.length > 0, 'GET /api/users');

  const partners = await request('/api/partners?q=');
  assert(partners.ok && Array.isArray(partners.data), 'GET /api/partners');

  // 4. Matchmaking
  const matchReq = await request('/matches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId: testUserId })
  });
  assert(matchReq.status === 202 || matchReq.status === 200, 'POST /matches (Queue Entry)');

  if (matchReq.data.requestId) {
    const cancelMatch = await request(`/matches/${matchReq.data.requestId}`, { method: 'DELETE' });
    assert(cancelMatch.ok, 'DELETE /matches/:id (Queue Exit)');
  }

  // 5. Audio Rooms
  const initialRooms = await request('/api/rooms');
  assert(initialRooms.ok && Array.isArray(initialRooms.data), 'GET /api/rooms');

  const createRoom = await request('/api/rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'E2E Audio Test Room',
      topic: 'Daily English',
      capacity: 40,
      hostId: testUserId
    })
  });
  assert(createRoom.status === 201 && createRoom.data.id, 'POST /api/rooms (Create Room)');
  const testRoomId = createRoom.data.id;

  const joinRoom = await request(`/api/rooms/${testRoomId}/join`, { method: 'POST' });
  assert(joinRoom.ok && joinRoom.data.listeners >= 1, 'POST /api/rooms/:id/join');

  const raiseHand = await request(`/api/rooms/${testRoomId}/raise-hand`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId: testUserId })
  });
  assert(raiseHand.ok, 'POST /api/rooms/:id/raise-hand (Speaker Request)');

  const approveSpeaker = await request(`/api/rooms/${testRoomId}/approve-speaker`, {
    method: 'POST',
    body: JSON.stringify({ userId: testUserId })
  });
  assert(approveSpeaker.ok, 'POST /api/rooms/:id/approve-speaker');

  const leaveRoom = await request(`/api/rooms/${testRoomId}/leave`, { method: 'POST' });
  assert(leaveRoom.ok, 'POST /api/rooms/:id/leave');

  // 6. Direct Messages
  const sendMsg = await request('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ from: 'u1', to: 'u2', text: 'Hello from test suite!' })
  });
  assert(sendMsg.status === 201 && sendMsg.data.id, 'POST /api/messages');

  const getMsgs = await request('/api/messages/u1/u2');
  assert(getMsgs.ok && Array.isArray(getMsgs.data) && getMsgs.data.length > 0, 'GET /api/messages/:a/:b');

  // 7. Vocabulary & Word Games
  const gameQuestions = await request('/games/questions');
  assert(gameQuestions.ok && gameQuestions.data.total >= 5, 'GET /games/questions');

  const dailyQuiz = await request('/api/quiz/daily');
  assert(dailyQuiz.ok && dailyQuiz.data.wordOfTheDay, 'GET /api/quiz/daily');

  const gameAttempt = await request('/games/attempts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      answers: { q_meaning_1: 0, q_fitb_1: 0 }
    })
  });
  assert(gameAttempt.ok && gameAttempt.data.score !== undefined, 'POST /games/attempts');

  const addVocab = await request('/api/vocabulary', {
    method: 'POST',
    body: JSON.stringify({ userId: testUserId, word: 'articulate', category: 'Speaking' })
  });
  assert(addVocab.status === 201 && addVocab.data.word === 'articulate', 'POST /api/vocabulary');

  const getVocab = await request(`/api/vocabulary/${testUserId}`);
  assert(getVocab.ok && getVocab.data.some((v) => v.word === 'articulate'), 'GET /api/vocabulary/:userId');

  // 8. Everyday Phrases Library
  const phrases = await request('/phrases');
  assert(phrases.ok && phrases.data.total >= 8, 'GET /phrases');

  const favPhrase = await request('/phrases/phr_greet_1/favourite', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(favPhrase.ok && favPhrase.data.favourited === true, 'POST /phrases/:id/favourite');

  const addPhraseCMS = await request('/admin/phrases', {
    method: 'POST',
    body: JSON.stringify({
      phrase: 'Test Phrase CMS',
      meaning: 'A test phrase for CMS verification',
      category: 'everyday conversation'
    })
  });
  assert(addPhraseCMS.status === 201 && addPhraseCMS.data.phrase.id, 'POST /admin/phrases');
  const customPhraseId = addPhraseCMS.data.phrase.id;

  const deletePhraseCMS = await request(`/admin/phrases/${customPhraseId}`, { method: 'DELETE' });
  assert(deletePhraseCMS.ok, 'DELETE /admin/phrases/:id');

  // 9. Safety, Blocking & Moderation
  const blockUser = await request('/blocks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetUserId: 'u3', reason: 'Unsolicited spamming' })
  });
  assert(blockUser.status === 201, 'POST /blocks (Block User)');

  const getBlocks = await request(`/blocks/${testUserId}`);
  assert(getBlocks.ok && getBlocks.data.blockedUsers.includes('u3'), 'GET /blocks/:userId');

  const reportUser = await request('/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      reportedUserId: 'u3',
      reason: 'Repeated inappropriate behavior during audio session.'
    })
  });
  assert(reportUser.status === 201 && reportUser.data.report.id, 'POST /reports');
  const testReportId = reportUser.data.report.id;

  // Anti-Spam: Test self-reporting rejection
  const selfReport = await request('/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reportedUserId: testUserId, reason: 'Trying to report self.' })
  });
  assert(selfReport.status === 400, 'POST /reports (Prevent Self-Reporting)');

  const resolveReport = await request(`/api/reports/${testReportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'resolved' })
  });
  assert(resolveReport.ok && resolveReport.data.report.status === 'resolved', 'PATCH /api/reports/:id');

  const unblockUser = await request(`/blocks/${testUserId}/u3`, { method: 'DELETE' });
  assert(unblockUser.ok, 'DELETE /blocks/:userId/:targetId');

  // 10. Referrals
  const referrals = await request(`/referrals/${testUserId}`);
  assert(referrals.ok && referrals.data.referralCode, 'GET /referrals/:userId');

  const claimReferral = await request('/referrals/claim', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ referralCode: 'BYTALK-PAVAN', newUserId: testUserId })
  });
  assert(claimReferral.ok && claimReferral.data.status === 'qualified', 'POST /referrals/claim');

  // 11. Admin Audit & User Management
  const auditLogs = await request('/admin/audit');
  assert(auditLogs.ok && Array.isArray(auditLogs.data.auditLogs), 'GET /admin/audit');

  const suspendUser = await request(`/admin/users/${testUserId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'suspended' })
  });
  assert(suspendUser.ok && suspendUser.data.user.status === 'suspended', 'PATCH /admin/users/:id/status (Suspend)');

  const reactivateUser = await request(`/admin/users/${testUserId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'active' })
  });
  assert(reactivateUser.ok && reactivateUser.data.user.status === 'active', 'PATCH /admin/users/:id/status (Reactivate)');

  const stats = await request('/api/stats');
  assert(stats.ok && stats.data.users > 0, 'GET /api/stats');

  // 12. Socket.IO Real-Time Signaling
  await new Promise((resolve) => {
    const socket = ClientIO(BASE_URL, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      assert(true, 'Socket.IO Client Connection');
      socket.emit('user:online', { userId: testUserId });
      socket.emit('ping:app');
    });

    socket.on('pong:app', () => {
      assert(true, 'Socket.IO ping:app -> pong:app roundtrip');
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (err) => {
      assert(false, 'Socket.IO Connection', err.message);
      resolve();
    });

    setTimeout(() => {
      socket.disconnect();
      resolve();
    }, 4000);
  });

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
