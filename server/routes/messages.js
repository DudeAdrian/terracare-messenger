/**
 * Message Routes
 * 
 * Handles encrypted message storage and retrieval
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('../middleware/auth');

// In-memory message store (replace with database in production)
const messageStore = new Map();
const conversations = new Map();

/**
 * @POST /api/messages/send
 * Send an encrypted message
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, encryptedContent, messageType = 'text' } = req.body;
    const from = req.user.phoneNumber || req.user.address;

    if (!to || !encryptedContent) {
      return res.status(400).json({
        success: false,
        error: 'Recipient and encrypted content are required'
      });
    }

    const messageId = uuidv4();
    const timestamp = new Date().toISOString();
    const conversationId = [from, to].sort().join('-');

    const message = {
      id: messageId,
      conversationId,
      from,
      to,
      encryptedContent,
      messageType,
      timestamp,
      status: 'sent'
    };

    // Store message
    messageStore.set(messageId, message);

    // Add to conversation
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);
    }
    conversations.get(conversationId).push(message);

    res.json({
      success: true,
      data: {
        messageId,
        conversationId,
        timestamp,
        status: 'sent'
      }
    });
  } catch (error) {
    console.error('[Message:Send]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @GET /api/messages/:conversationId
 * Get message history for a conversation
 */
router.get('/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;
    const user = req.user.phoneNumber || req.user.address;

    // Verify user is part of this conversation
    const participants = conversationId.split('-');
    if (!participants.includes(user)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    let messages = conversations.get(conversationId) || [];

    // Sort by timestamp (newest first)
    messages = messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    if (before) {
      const beforeIndex = messages.findIndex(m => m.id === before);
      if (beforeIndex > -1) {
        messages = messages.slice(beforeIndex + 1);
      }
    }

    messages = messages.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        conversationId,
        messages,
        count: messages.length
      }
    });
  } catch (error) {
    console.error('[Message:Get]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @DELETE /api/messages/:messageId
 * Delete a message
 */
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = req.user.phoneNumber || req.user.address;

    const message = messageStore.get(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Verify ownership
    if (message.from !== user) {
      return res.status(403).json({
        success: false,
        error: 'Can only delete your own messages'
      });
    }

    // Remove from store
    messageStore.delete(messageId);

    // Remove from conversation
    const conversation = conversations.get(message.conversationId);
    if (conversation) {
      const index = conversation.findIndex(m => m.id === messageId);
      if (index > -1) {
        conversation.splice(index, 1);
      }
    }

    res.json({
      success: true,
      data: {
        messageId,
        deleted: true
      }
    });
  } catch (error) {
    console.error('[Message:Delete]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @GET /api/messages/conversations/list
 * List user's conversations
 */
router.get('/conversations/list', authenticate, async (req, res) => {
  try {
    const user = req.user.phoneNumber || req.user.address;

    const userConversations = [];

    for (const [conversationId, messages] of conversations.entries()) {
      const participants = conversationId.split('-');
      if (participants.includes(user) && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const otherParticipant = participants.find(p => p !== user);

        userConversations.push({
          conversationId,
          participant: otherParticipant,
          lastMessage: {
            id: lastMessage.id,
            timestamp: lastMessage.timestamp,
            messageType: lastMessage.messageType
          },
          messageCount: messages.length
        });
      }
    }

    // Sort by last message timestamp
    userConversations.sort((a, b) => 
      new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );

    res.json({
      success: true,
      data: {
        conversations: userConversations,
        count: userConversations.length
      }
    });
  } catch (error) {
    console.error('[Message:Conversations]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
