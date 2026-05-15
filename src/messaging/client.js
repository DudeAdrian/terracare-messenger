/**
 * Messaging Client
 * 
 * Handles encrypted messaging with E2E encryption
 */

const io = require('socket.io-client');
const { SignalProtocol } = require('../encryption/signal');

class MessagingClient {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.socket = null;
    this.protocol = new SignalProtocol();
    this.isConnected = false;

    // Event callbacks
    this.onMessageReceived = null;
    this.onMessageSent = null;
    this.onTyping = null;
    this.onReadReceipt = null;
    this.onUserOnline = null;
    this.onUserOffline = null;
    this.onError = null;
  }

  /**
   * Initialize the messaging client
   */
  async initialize() {
    // Generate identity key pair
    this.protocol.generateIdentityKeyPair();
    
    // Generate pre-keys
    this.protocol.generatePreKeys();
    
    // Generate signed pre-key
    this.protocol.generateSignedPreKey();

    console.log('[Messaging] Protocol initialized');
  }

  /**
   * Connect to the messaging server
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.apiUrl, {
        auth: { token: this.token },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('[Messaging] Connected to server');
        this.isConnected = true;
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Messaging] Connection error:', error);
        reject(error);
      });

      this.socket.on('error', (error) => {
        console.error('[Messaging] Socket error:', error);
        
        if (this.onError) {
          this.onError(error);
        }
      });
    });
  }

  /**
   * Setup socket event listeners
   */
  setupEventListeners() {
    // Message received
    this.socket.on('message:receive', async (data) => {
      console.log('[Messaging] Message received from:', data.from);

      try {
        // Decrypt message if we have a session
        const session = this.protocol.sessions.get(data.from);
        if (session) {
          const decrypted = await this.protocol.decrypt(data.from, {
            ciphertext: data.encryptedContent.ciphertext,
            iv: data.encryptedContent.iv,
            authTag: data.encryptedContent.authTag
          });

          data.plaintext = decrypted;
        }

        if (this.onMessageReceived) {
          this.onMessageReceived(data);
        }
      } catch (error) {
        console.error('[Messaging] Decrypt error:', error);
        
        // Still emit message but without decryption
        if (this.onMessageReceived) {
          this.onMessageReceived(data);
        }
      }
    });

    // Message sent confirmation
    this.socket.on('message:sent', (data) => {
      console.log('[Messaging] Message sent:', data.messageId);
      
      if (this.onMessageSent) {
        this.onMessageSent(data);
      }
    });

    // Typing indicator
    this.socket.on('typing:start', (data) => {
      if (this.onTyping) {
        this.onTyping({ ...data, isTyping: true });
      }
    });

    this.socket.on('typing:stop', (data) => {
      if (this.onTyping) {
        this.onTyping({ ...data, isTyping: false });
      }
    });

    // Read receipt
    this.socket.on('message:read', (data) => {
      console.log('[Messaging] Message read:', data.messageId);
      
      if (this.onReadReceipt) {
        this.onReadReceipt(data);
      }
    });

    // User online/offline
    this.socket.on('user:online', (data) => {
      console.log('[Messaging] User online:', data.userId);
      
      if (this.onUserOnline) {
        this.onUserOnline(data);
      }
    });

    this.socket.on('user:offline', (data) => {
      console.log('[Messaging] User offline:', data.userId);
      
      if (this.onUserOffline) {
        this.onUserOffline(data);
      }
    });
  }

  /**
   * Initialize session with a contact
   * @param {string} contactId - Contact identifier
   * @param {Object} preKeyBundle - Contact's pre-key bundle
   */
  async initializeSession(contactId, preKeyBundle) {
    await this.protocol.initializeSession(contactId, preKeyBundle);
    console.log('[Messaging] Session initialized with:', contactId);
  }

  /**
   * Send encrypted message
   * @param {string} to - Recipient ID
   * @param {string} message - Plaintext message
   * @param {string} messageType - Message type
   * @returns {Promise<Object>} Message metadata
   */
  async sendMessage(to, message, messageType = 'text') {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }

    // Initialize session if needed
    if (!this.protocol.sessions.has(to)) {
      // For demo purposes, create a simple session
      // In production, fetch pre-key bundle from server
      await this.protocol.initializeSession(to, {
        identityKey: 'placeholder',
        signedPreKey: 'placeholder'
      });
    }

    // Encrypt message
    const encrypted = await this.protocol.encrypt(to, message);

    // Send via socket
    this.socket.emit('message:send', {
      to,
      encryptedContent: encrypted,
      messageType
    });

    return {
      to,
      timestamp: new Date().toISOString(),
      messageType
    };
  }

  /**
   * Send typing indicator
   * @param {string} to - Recipient ID
   * @param {boolean} isTyping - Whether user is typing
   */
  sendTyping(to, isTyping) {
    if (!this.isConnected) return;

    const event = isTyping ? 'typing:start' : 'typing:stop';
    this.socket.emit(event, { to });
  }

  /**
   * Send read receipt
   * @param {string} messageId - Message ID
   * @param {string} from - Original sender
   */
  sendReadReceipt(messageId, from) {
    if (!this.isConnected) return;

    this.socket.emit('message:read', { messageId, from });
  }

  /**
   * Get public key bundle for sharing
   * @returns {Object}
   */
  getPublicKeyBundle() {
    return this.protocol.getPublicKeyBundle();
  }

  /**
   * Get conversation history from server
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} Message history
   */
  async getConversationHistory(conversationId, options = {}) {
    const { limit = 50, before } = options;
    
    let url = `${this.apiUrl}/api/messages/${conversationId}?limit=${limit}`;
    if (before) {
      url += `&before=${before}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data.messages;
  }

  /**
   * Get list of conversations
   * @returns {Promise<Array>} Conversations list
   */
  async getConversations() {
    const response = await fetch(`${this.apiUrl}/api/messages/conversations/list`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data.conversations;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    console.log('[Messaging] Disconnected');
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  connected() {
    return this.isConnected;
  }
}

module.exports = {
  MessagingClient
};
