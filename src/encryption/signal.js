/**
 * Signal Protocol Implementation
 * 
 * End-to-end encryption using the Signal Protocol
 * Based on the Double Ratchet Algorithm
 */

const crypto = require('crypto');

class SignalProtocol {
  constructor() {
    // Store identity key pairs
    this.identityKeyPair = null;
    // Store pre-keys
    this.preKeys = new Map();
    // Store signed pre-key
    this.signedPreKey = null;
    // Store session states
    this.sessions = new Map();
  }

  /**
   * Generate identity key pair (Ed25519)
   * @returns {Object} Key pair
   */
  generateIdentityKeyPair() {
    // Use ECDSA for identity (simplified - use proper library in production)
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      privateKeyEncoding: { type: 'pkcs8', format: 'jwk' },
      publicKeyEncoding: { type: 'spki', format: 'jwk' }
    });

    this.identityKeyPair = {
      privateKey: privateKey.d,
      publicKey: publicKey.x + publicKey.y
    };

    return this.identityKeyPair;
  }

  /**
   * Generate pre-keys (X25519)
   * @param {number} count - Number of pre-keys to generate
   * @returns {Array} Array of pre-keys
   */
  generatePreKeys(count = 100) {
    const preKeys = [];

    for (let i = 0; i < count; i++) {
      const keyId = i;
      const keyPair = this.generateECDHKeyPair();
      
      this.preKeys.set(keyId, keyPair);
      preKeys.push({
        keyId,
        publicKey: keyPair.publicKey
      });
    }

    return preKeys;
  }

  /**
   * Generate signed pre-key
   * @returns {Object} Signed pre-key
   */
  generateSignedPreKey() {
    const keyId = Date.now();
    const keyPair = this.generateECDHKeyPair();
    
    // Sign the public key with identity private key
    const signature = this.sign(keyPair.publicKey, this.identityKeyPair.privateKey);

    this.signedPreKey = {
      keyId,
      keyPair,
      signature
    };

    return {
      keyId,
      publicKey: keyPair.publicKey,
      signature
    };
  }

  /**
   * Generate ECDH key pair
   * @returns {Object} Key pair
   */
  generateECDHKeyPair() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519');
    
    return {
      privateKey: privateKey.export({ type: 'pkcs8', format: 'jwk' }),
      publicKey: publicKey.export({ type: 'spki', format: 'jwk' })
    };
  }

  /**
   * Sign data
   * @param {string} data - Data to sign
   * @param {string} privateKey - Private key
   * @returns {string} Signature
   */
  sign(data, privateKey) {
    return crypto
      .createSign('SHA256')
      .update(data)
      .sign(privateKey, 'base64');
  }

  /**
   * Verify signature
   * @param {string} data - Data that was signed
   * @param {string} signature - Signature
   * @param {string} publicKey - Public key
   * @returns {boolean} Verification result
   */
  verify(data, signature, publicKey) {
    return crypto
      .createVerify('SHA256')
      .update(data)
      .verify(publicKey, signature, 'base64');
  }

  /**
   * Initialize session with recipient
   * @param {string} recipientId - Recipient identifier
   * @param {Object} recipientPreKeyBundle - Recipient's pre-key bundle
   */
  async initializeSession(recipientId, recipientPreKeyBundle) {
    // X3DH Key Agreement
    const ephemeralKeyPair = this.generateECDHKeyPair();
    
    // DH1: Identity key agreement
    const dh1 = await this.deriveSharedSecret(
      this.identityKeyPair.privateKey,
      recipientPreKeyBundle.signedPreKey
    );

    // DH2: Ephemeral to identity
    const dh2 = await this.deriveSharedSecret(
      ephemeralKeyPair.privateKey,
      recipientPreKeyBundle.identityKey
    );

    // DH3: Ephemeral to signed pre-key
    const dh3 = await this.deriveSharedSecret(
      ephemeralKeyPair.privateKey,
      recipientPreKeyBundle.signedPreKey
    );

    // DH4: Ephemeral to one-time pre-key (if available)
    let dh4 = Buffer.alloc(0);
    if (recipientPreKeyBundle.preKey) {
      dh4 = await this.deriveSharedSecret(
        ephemeralKeyPair.privateKey,
        recipientPreKeyBundle.preKey
      );
    }

    // Derive root key
    const rootKey = crypto.createHash('sha256')
      .update(Buffer.concat([dh1, dh2, dh3, dh4]))
      .digest();

    // Initialize Double Ratchet
    const session = {
      rootKey,
      sendingChainKey: null,
      receivingChainKey: null,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      skippedMessageKeys: new Map()
    };

    this.sessions.set(recipientId, session);
    return session;
  }

  /**
   * Derive shared secret
   * @param {Object} privateKey - Private key
   * @param {Object} publicKey - Public key
   * @returns {Buffer} Shared secret
   */
  async deriveSharedSecret(privateKey, publicKey) {
    // Simplified ECDH - use proper library in production
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(privateKey.d || privateKey, 'base64'));
    return ecdh.computeSecret(Buffer.from(publicKey.x || publicKey, 'base64'));
  }

  /**
   * Encrypt message
   * @param {string} recipientId - Recipient identifier
   * @param {string} plaintext - Message to encrypt
   * @returns {Object} Encrypted message
   */
  async encrypt(recipientId, plaintext) {
    let session = this.sessions.get(recipientId);

    if (!session) {
      throw new Error(`Session not initialized for ${recipientId}`);
    }

    // Get or derive sending chain key
    if (!session.sendingChainKey) {
      session.sendingChainKey = await this.deriveChainKey(session.rootKey, 0);
    }

    // Derive message key from chain key
    const messageKey = await this.deriveMessageKey(session.sendingChainKey);

    // Encrypt message
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      messageKey,
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Update chain key (ratchet)
    session.sendingChainKey = await this.kdfCK(session.sendingChainKey);
    session.sendingMessageNumber++;

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      messageNumber: session.sendingMessageNumber - 1
    };
  }

  /**
   * Decrypt message
   * @param {string} senderId - Sender identifier
   * @param {Object} encryptedMessage - Encrypted message
   * @returns {string} Decrypted plaintext
   */
  async decrypt(senderId, encryptedMessage) {
    let session = this.sessions.get(senderId);

    if (!session) {
      throw new Error(`Session not initialized for ${senderId}`);
    }

    // Get or derive receiving chain key
    if (!session.receivingChainKey) {
      session.receivingChainKey = await this.deriveChainKey(session.rootKey, 1);
    }

    // Derive message key from chain key
    const messageKey = await this.deriveMessageKey(session.receivingChainKey);

    // Decrypt message
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      messageKey,
      Buffer.from(encryptedMessage.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(encryptedMessage.authTag, 'base64'));

    let decrypted = decipher.update(encryptedMessage.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Update chain key (ratchet)
    session.receivingChainKey = await this.kdfCK(session.receivingChainKey);
    session.receivingMessageNumber++;

    return decrypted;
  }

  /**
   * Derive chain key from root key
   * @param {Buffer} rootKey - Root key
   * @param {number} chain - Chain index (0 = sending, 1 = receiving)
   * @returns {Buffer} Chain key
   */
  async deriveChainKey(rootKey, chain) {
    return crypto.createHmac('sha256', rootKey)
      .update(`chain-${chain}`)
      .digest();
  }

  /**
   * Derive message key from chain key
   * @param {Buffer} chainKey - Chain key
   * @returns {Buffer} Message key
   */
  async deriveMessageKey(chainKey) {
    return crypto.createHmac('sha256', chainKey)
      .update('message-key')
      .digest();
  }

  /**
   * Key Derivation Function for Chain Key (KDF_CK)
   * @param {Buffer} chainKey - Current chain key
   * @returns {Buffer} New chain key
   */
  async kdfCK(chainKey) {
    return crypto.createHmac('sha256', chainKey)
      .update('ratchet')
      .digest();
  }

  /**
   * Get public key bundle for sharing
   * @returns {Object} Public key bundle
   */
  getPublicKeyBundle() {
    return {
      identityKey: this.identityKeyPair.publicKey,
      signedPreKey: this.signedPreKey ? {
        keyId: this.signedPreKey.keyId,
        publicKey: this.signedPreKey.keyPair.publicKey,
        signature: this.signedPreKey.signature
      } : null,
      preKeys: Array.from(this.preKeys.entries()).map(([keyId, keyPair]) => ({
        keyId,
        publicKey: keyPair.publicKey
      }))
    };
  }

  /**
   * Export session data
   * @param {string} recipientId - Recipient identifier
   * @returns {Object} Session data
   */
  exportSession(recipientId) {
    const session = this.sessions.get(recipientId);
    if (!session) return null;

    return {
      rootKey: session.rootKey.toString('base64'),
      sendingChainKey: session.sendingChainKey ? session.sendingChainKey.toString('base64') : null,
      receivingChainKey: session.receivingChainKey ? session.receivingChainKey.toString('base64') : null,
      sendingMessageNumber: session.sendingMessageNumber,
      receivingMessageNumber: session.receivingMessageNumber
    };
  }

  /**
   * Import session data
   * @param {string} recipientId - Recipient identifier
   * @param {Object} sessionData - Session data
   */
  importSession(recipientId, sessionData) {
    this.sessions.set(recipientId, {
      rootKey: Buffer.from(sessionData.rootKey, 'base64'),
      sendingChainKey: sessionData.sendingChainKey ? Buffer.from(sessionData.sendingChainKey, 'base64') : null,
      receivingChainKey: sessionData.receivingChainKey ? Buffer.from(sessionData.receivingChainKey, 'base64') : null,
      sendingMessageNumber: sessionData.sendingMessageNumber,
      receivingMessageNumber: sessionData.receivingMessageNumber,
      skippedMessageKeys: new Map()
    });
  }
}

module.exports = {
  SignalProtocol
};
