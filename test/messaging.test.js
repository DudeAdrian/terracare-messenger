/**
 * Messaging Tests
 * 
 * Tests for messaging API endpoints
 */

const request = require('supertest');
const { app } = require('../server/index');

describe('Messaging API', () => {
  let authToken;
  let phoneNumber = '+1234567890';

  beforeAll(async () => {
    // Get auth token
    const otpRequest = await request(app)
      .post('/api/auth/otp/request')
      .send({ phoneNumber });

    const { otp } = otpRequest.body.data;

    const verifyResponse = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phoneNumber, otp });

    authToken = verifyResponse.body.data.token;
  });

  describe('POST /api/messages/send', () => {
    test('should send encrypted message', async () => {
      const response = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          to: '+0987654321',
          encryptedContent: {
            ciphertext: 'encrypted_data',
            iv: 'initialization_vector',
            authTag: 'auth_tag'
          },
          messageType: 'text'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('messageId');
      expect(response.body.data).toHaveProperty('conversationId');
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/messages/send')
        .send({
          to: '+0987654321',
          encryptedContent: { ciphertext: 'test' }
        });

      expect(response.status).toBe(401);
    });

    test('should fail with missing fields', async () => {
      const response = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages/conversations/list', () => {
    test('should get conversations list', async () => {
      const response = await request(app)
        .get('/api/messages/conversations/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('conversations');
      expect(Array.isArray(response.body.data.conversations)).toBe(true);
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/messages/conversations/list');

      expect(response.status).toBe(401);
    });
  });
});
