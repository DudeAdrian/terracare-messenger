/**
 * Authentication Tests
 * 
 * Tests for SMS and wallet authentication
 */

const request = require('supertest');
const { app } = require('../server/index');

describe('Authentication API', () => {
  describe('POST /api/auth/otp/request', () => {
    test('should request OTP with valid phone number', async () => {
      const response = await request(app)
        .post('/api/auth/otp/request')
        .send({ phoneNumber: '+1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('expiresIn');
    });

    test('should fail with invalid phone number format', async () => {
      const response = await request(app)
        .post('/api/auth/otp/request')
        .send({ phoneNumber: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should fail with missing phone number', async () => {
      const response = await request(app)
        .post('/api/auth/otp/request')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/otp/verify', () => {
    test('should verify OTP and return token', async () => {
      // First request OTP
      const requestResponse = await request(app)
        .post('/api/auth/otp/request')
        .send({ phoneNumber: '+1234567890' });

      const { otp } = requestResponse.body.data;

      // Then verify
      const verifyResponse = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phoneNumber: '+1234567890', otp });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data).toHaveProperty('token');
      expect(verifyResponse.body.data).toHaveProperty('phoneNumber');
    });

    test('should fail with invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phoneNumber: '+1234567890', otp: '000000' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/wallet', () => {
    test('should fail with missing parameters', async () => {
      const response = await request(app)
        .post('/api/auth/wallet')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
