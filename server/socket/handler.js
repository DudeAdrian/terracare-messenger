/**
 * Socket.io Handler
 * 
 * Manages real-time messaging and WebRTC signaling
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'terracare-secret-key';

// Connected users map (userId -> socketId)
const connectedUsers = new Map();

// Active calls map (callId -> { caller, callee, status })
const activeCalls = new Map();

/**
 * Authenticate socket connection
 * @param {Object} socket - Socket instance
 * @returns {Object|null} Decoded token or null
 */
function authenticateSocket(socket) {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.query.token;

    if (!token) {
      return null;
    }

    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Handle socket connection
 * @param {Object} socket - Socket instance
 * @param {Object} io - Socket.io server instance
 */
function handleSocketConnection(socket, io) {
  // Authenticate
  const user = authenticateSocket(socket);

  if (!user) {
    console.log('[Socket] Unauthorized connection attempt');
    socket.emit('error', { message: 'Unauthorized' });
    socket.disconnect();
    return;
  }

  const userId = user.phoneNumber || user.address;
  connectedUsers.set(userId, socket.id);

  console.log(`[Socket] User connected: ${userId}`);

  // Join personal room for direct messaging
  socket.join(userId);

  // Update user status
  socket.broadcast.emit('user:online', { userId });

  // === Messaging Events ===

  /**
   * Handle new message
   */
  socket.on('message:send', (data) => {
    const { to, encryptedContent, messageType } = data;

    const message = {
      id: require('uuid').v4(),
      from: userId,
      to,
      encryptedContent,
      messageType: messageType || 'text',
      timestamp: new Date().toISOString()
    };

    // Send to recipient if online
    socket.to(to).emit('message:receive', message);

    // Acknowledge to sender
    socket.emit('message:sent', { messageId: message.id, to });

    console.log(`[Socket] Message from ${userId} to ${to}`);
  });

  /**
   * Handle typing indicator
   */
  socket.on('typing:start', ({ to }) => {
    socket.to(to).emit('typing:start', { from: userId });
  });

  socket.on('typing:stop', ({ to }) => {
    socket.to(to).emit('typing:stop', { from: userId });
  });

  /**
   * Handle read receipts
   */
  socket.on('message:read', ({ messageId, from }) => {
    socket.to(from).emit('message:read', { messageId, by: userId });
  });

  // === WebRTC Video Call Events ===

  /**
   * Initiate video call
   */
  socket.on('call:initiate', ({ to, callId }) => {
    const targetSocketId = connectedUsers.get(to);

    if (!targetSocketId) {
      socket.emit('call:error', { message: 'User is offline', callId });
      return;
    }

    // Store active call
    activeCalls.set(callId, {
      caller: userId,
      callee: to,
      status: 'ringing',
      startedAt: Date.now()
    });

    // Notify callee
    io.to(targetSocketId).emit('call:incoming', {
      callId,
      from: userId,
      type: 'video'
    });

    console.log(`[Socket] Call initiated: ${callId} from ${userId} to ${to}`);
  });

  /**
   * Answer video call
   */
  socket.on('call:answer', ({ callId, answer }) => {
    const call = activeCalls.get(callId);

    if (!call) {
      socket.emit('call:error', { message: 'Call not found', callId });
      return;
    }

    if (call.callee !== userId) {
      socket.emit('call:error', { message: 'Not authorized', callId });
      return;
    }

    call.status = answer ? 'connected' : 'declined';

    // Notify caller
    const callerSocketId = connectedUsers.get(call.caller);
    if (callerSocketId) {
      io.to(callerSocketId).emit(answer ? 'call:accepted' : 'call:declined', {
        callId,
        by: userId
      });
    }

    console.log(`[Socket] Call ${answer ? 'accepted' : 'declined'}: ${callId}`);
  });

  /**
   * WebRTC Offer
   */
  socket.on('call:offer', ({ callId, to, offer }) => {
    const targetSocketId = connectedUsers.get(to);

    if (targetSocketId) {
      io.to(targetSocketId).emit('call:offer', { callId, from: userId, offer });
    }
  });

  /**
   * WebRTC Answer
   */
  socket.on('call:answer-sdp', ({ callId, to, answer }) => {
    const targetSocketId = connectedUsers.get(to);

    if (targetSocketId) {
      io.to(targetSocketId).emit('call:answer', { callId, from: userId, answer });
    }
  });

  /**
   * ICE Candidate exchange
   */
  socket.on('call:ice-candidate', ({ callId, to, candidate }) => {
    const targetSocketId = connectedUsers.get(to);

    if (targetSocketId) {
      io.to(targetSocketId).emit('call:ice-candidate', {
        callId,
        from: userId,
        candidate
      });
    }
  });

  /**
   * End video call
   */
  socket.on('call:end', ({ callId }) => {
    const call = activeCalls.get(callId);

    if (!call) return;

    // Notify other party
    const otherParty = call.caller === userId ? call.callee : call.caller;
    const otherSocketId = connectedUsers.get(otherParty);

    if (otherSocketId) {
      io.to(otherSocketId).emit('call:ended', {
        callId,
        by: userId,
        duration: Date.now() - call.startedAt
      });
    }

    activeCalls.delete(callId);

    console.log(`[Socket] Call ended: ${callId}`);
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${userId}`);

    // Remove from connected users
    connectedUsers.delete(userId);

    // Broadcast offline status
    socket.broadcast.emit('user:offline', { userId });

    // End any active calls
    for (const [callId, call] of activeCalls.entries()) {
      if (call.caller === userId || call.callee === userId) {
        const otherParty = call.caller === userId ? call.callee : call.caller;
        const otherSocketId = connectedUsers.get(otherParty);

        if (otherSocketId) {
          io.to(otherSocketId).emit('call:ended', {
            callId,
            reason: 'user_disconnected'
          });
        }

        activeCalls.delete(callId);
      }
    }
  });
}

/**
 * Get connected users list
 * @returns {Array} List of connected user IDs
 */
function getConnectedUsers() {
  return Array.from(connectedUsers.keys());
}

/**
 * Check if user is online
 * @param {string} userId - User ID
 * @returns {boolean} Online status
 */
function isUserOnline(userId) {
  return connectedUsers.has(userId);
}

module.exports = {
  handleSocketConnection,
  getConnectedUsers,
  isUserOnline
};
