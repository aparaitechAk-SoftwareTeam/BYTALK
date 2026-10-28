// WebRTC Audio Signaling & Matchmaking Module for BYTALK
// Conforming to Aparaitech Software BYTALK Specification (Sections 7, 8, 9, 12, 18, 20)

export function setupSignaling(io, store, save) {
  // In-memory queue for random conversation matchmaking
  // Elements: { socketId, userId, name, level, requestedAt, blockedUsers }
  const matchmakingQueue = [];

  // Active audio sessions: sessionId -> { callerId, calleeId, startedAt }
  const activeSessions = new Map();

  // Socket mappings: socketId <-> userId
  const socketToUser = new Map();
  const userToSocket = new Map();

  io.on('connection', (socket) => {
    // Register user presence
    socket.on('user:online', ({ userId }) => {
      if (!userId) return;
      socketToUser.set(socket.id, userId);
      userToSocket.set(userId, socket.id);

      const user = store.users.find((u) => u.id === userId);
      if (user) {
        user.online = true;
        save();
        io.emit('users:presence', { userId, online: true });
      }
    });

    // 1. RANDOM PARTNER MATCHMAKING (Section 7 & Section 12)
    socket.on('partner:find', (userData) => {
      const userId = userData?.userId || socketToUser.get(socket.id) || socket.id;
      const userLevel = userData?.level || 'Intermediate';

      const currentUser = store.users.find((u) => u.id === userId) || {};
      const userBlockedList = currentUser.blockedUsers || [];

      // Remove any existing entry for this socket or user
      const existingIdx = matchmakingQueue.findIndex(
        (entry) => entry.socketId === socket.id || entry.userId === userId
      );
      if (existingIdx !== -1) {
        matchmakingQueue.splice(existingIdx, 1);
      }

      // Check if user is currently in an active session
      const isAlreadyInSession = Array.from(activeSessions.values()).some(
        (s) => s.callerId === userId || s.calleeId === userId
      );
      if (isAlreadyInSession) {
        socket.emit('match:error', { error: 'You are already in an active audio session.' });
        return;
      }

      // Find partner satisfying block exclusions (Section 12: "blocked accounts must not be rematched")
      const partnerIdx = matchmakingQueue.findIndex((entry) => {
        if (entry.userId === userId) return false;

        // Check if currentUser blocked this candidate
        if (userBlockedList.includes(entry.userId)) return false;

        // Check if candidate blocked currentUser
        const partnerRecord = store.users.find((u) => u.id === entry.userId);
        if (partnerRecord && (partnerRecord.blockedUsers || []).includes(userId)) return false;

        return true;
      });

      if (partnerIdx !== -1) {
        // Suitable unblocked partner found!
        const partner = matchmakingQueue.splice(partnerIdx, 1)[0];
        const sessionId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const partnerUser = store.users.find((u) => u.id === partner.userId) || {
          id: partner.userId,
          name: partner.name
        };

        // Record active session
        activeSessions.set(sessionId, {
          callerId: userId,
          calleeId: partner.userId,
          startedAt: Date.now()
        });

        // Notify both peers (Contract: match:found / partner:matched)
        socket.emit('partner:matched', {
          sessionId,
          role: 'caller', // initiator of WebRTC offer
          partner: {
            id: partnerUser.id,
            name: partnerUser.name || 'Anonymous Learner',
            country: partnerUser.country || 'Global',
            level: partnerUser.level || 'Intermediate'
          }
        });
        socket.emit('match:found', { sessionId, partnerId: partnerUser.id });

        io.to(partner.socketId).emit('partner:matched', {
          sessionId,
          role: 'receiver', // responds with WebRTC answer
          partner: {
            id: currentUser.id || userId,
            name: currentUser.name || 'Anonymous Learner',
            country: currentUser.country || 'Global',
            level: currentUser.level || 'Intermediate'
          }
        });
        io.to(partner.socketId).emit('match:found', { sessionId, partnerId: currentUser.id || userId });
      } else {
        // Enqueue user
        matchmakingQueue.push({
          socketId: socket.id,
          userId,
          name: userData?.name || currentUser.name || 'Learner',
          level: userLevel,
          requestedAt: Date.now()
        });

        socket.emit('partner:waiting', { message: 'Searching for an available English conversation partner...' });
      }
    });

    socket.on('partner:cancel', () => {
      const idx = matchmakingQueue.findIndex((entry) => entry.socketId === socket.id);
      if (idx !== -1) {
        matchmakingQueue.splice(idx, 1);
        socket.emit('partner:cancelled');
      }
    });

    // 2. WEBRTC P2P AUDIO SIGNALING RELAY (Section 18 & 20)
    socket.on('call:offer', ({ toUserId, sessionId, offer }) => {
      const recipientSocketId = userToSocket.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:offer', {
          fromUserId: socketToUser.get(socket.id),
          sessionId,
          offer
        });
      }
    });

    socket.on('call:answer', ({ toUserId, sessionId, answer }) => {
      const recipientSocketId = userToSocket.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:answer', {
          fromUserId: socketToUser.get(socket.id),
          sessionId,
          answer
        });
      }
    });

    socket.on('call:ice-candidate', ({ toUserId, sessionId, candidate }) => {
      const recipientSocketId = userToSocket.get(toUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:ice-candidate', {
          fromUserId: socketToUser.get(socket.id),
          sessionId,
          candidate
        });
      }
    });

    // Call End and practice duration recording (Section 14 & 20)
    socket.on('call:end', ({ peerUserId, sessionId, durationSeconds }) => {
      const myUserId = socketToUser.get(socket.id);
      const recipientSocketId = userToSocket.get(peerUserId);

      if (sessionId) {
        activeSessions.delete(sessionId);
      }

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call:ended', { sessionId, peerUserId: myUserId });
      }

      // Record practice minutes if call lasted >= 15 seconds
      if (durationSeconds && durationSeconds >= 15) {
        const minutesToAdd = Math.ceil(durationSeconds / 60);

        [myUserId, peerUserId].forEach((uid) => {
          if (!uid) return;
          const u = store.users.find((x) => x.id === uid);
          if (u) {
            u.minutes = (u.minutes || 0) + minutesToAdd;
          }
        });
        save();
      }
    });

    // 3. LIVE AUDIO ROOMS (Section 8 & 9)
    socket.on('room:join-live', ({ roomId, userId }) => {
      socket.join(`room_${roomId}`);
      // By default, members join as listeners with microphone muted (Section 9)
      io.to(`room_${roomId}`).emit('room:user-joined', {
        roomId,
        userId,
        socketId: socket.id,
        role: 'listener',
        micMuted: true
      });
    });

    socket.on('room:leave-live', ({ roomId, userId }) => {
      socket.leave(`room_${roomId}`);
      io.to(`room_${roomId}`).emit('room:user-left', { roomId, userId });
    });

    socket.on('room:speaker-request', ({ roomId, userId, userName }) => {
      io.to(`room_${roomId}`).emit('room:speaker-request', { roomId, userId, userName });
    });

    socket.on('room:speaker-grant', ({ roomId, targetUserId }) => {
      io.to(`room_${roomId}`).emit('room:speaker-granted', { roomId, targetUserId });
    });

    socket.on('room:mic-toggle', ({ roomId, userId, isMuted }) => {
      io.to(`room_${roomId}`).emit('room:mic-changed', { roomId, userId, isMuted });
    });

    // Cleanup on socket disconnect
    socket.on('disconnect', () => {
      const queueIdx = matchmakingQueue.findIndex((entry) => entry.socketId === socket.id);
      if (queueIdx !== -1) matchmakingQueue.splice(queueIdx, 1);

      const userId = socketToUser.get(socket.id);
      if (userId) {
        userToSocket.delete(userId);
        socketToUser.delete(socket.id);

        const user = store.users.find((u) => u.id === userId);
        if (user) {
          user.online = false;
          save();
          io.emit('users:presence', { userId, online: false });
        }
      }
    });
  });

  return {
    matchmakingQueue,
    activeSessions
  };
}
