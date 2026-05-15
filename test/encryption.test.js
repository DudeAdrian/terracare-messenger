/**
 * Encryption Tests
 * 
 * Tests for Signal Protocol implementation
 */

const { SignalProtocol } = require('../src/encryption/signal');

describe('Signal Protocol', () => {
  let alice;
  let bob;

  beforeEach(() => {
    alice = new SignalProtocol();
    bob = new SignalProtocol();
  });

  test('should generate identity key pair', () => {
    const keyPair = alice.generateIdentityKeyPair();
    
    expect(keyPair).toHaveProperty('privateKey');
    expect(keyPair).toHaveProperty('publicKey');
    expect(alice.identityKeyPair).toEqual(keyPair);
  });

  test('should generate pre-keys', () => {
    const count = 10;
    const preKeys = alice.generatePreKeys(count);
    
    expect(preKeys).toHaveLength(count);
    expect(preKeys[0]).toHaveProperty('keyId');
    expect(preKeys[0]).toHaveProperty('publicKey');
    expect(alice.preKeys.size).toBe(count);
  });

  test('should generate signed pre-key', () => {
    // Generate identity first
    alice.generateIdentityKeyPair();
    
    const signedPreKey = alice.generateSignedPreKey();
    
    expect(signedPreKey).toHaveProperty('keyId');
    expect(signedPreKey).toHaveProperty('publicKey');
    expect(signedPreKey).toHaveProperty('signature');
    expect(alice.signedPreKey).toBeDefined();
  });

  test('should get public key bundle', () => {
    alice.generateIdentityKeyPair();
    alice.generatePreKeys(5);
    alice.generateSignedPreKey();
    
    const bundle = alice.getPublicKeyBundle();
    
    expect(bundle).toHaveProperty('identityKey');
    expect(bundle).toHaveProperty('signedPreKey');
    expect(bundle).toHaveProperty('preKeys');
    expect(bundle.preKeys).toHaveLength(5);
  });

  test('should export and import session', async () => {
    // Setup keys
    alice.generateIdentityKeyPair();
    alice.generatePreKeys(5);
    alice.generateSignedPreKey();
    
    bob.generateIdentityKeyPair();
    bob.generatePreKeys(5);
    bob.generateSignedPreKey();
    
    // Initialize session from Alice to Bob
    const bobBundle = bob.getPublicKeyBundle();
    await alice.initializeSession('bob', {
      identityKey: bobBundle.identityKey,
      signedPreKey: bobBundle.signedPreKey.publicKey
    });
    
    // Export session
    const exported = alice.exportSession('bob');
    
    expect(exported).toHaveProperty('rootKey');
    expect(exported).toHaveProperty('sendingMessageNumber');
    
    // Create new protocol and import
    const charlie = new SignalProtocol();
    charlie.importSession('bob', exported);
    
    const importedSession = charlie.sessions.get('bob');
    expect(importedSession).toBeDefined();
    expect(importedSession.rootKey.toString('base64')).toBe(exported.rootKey);
  });
});
