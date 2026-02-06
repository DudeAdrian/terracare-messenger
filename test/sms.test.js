/**
 * SMS Auth Client Tests
 * 
 * Tests for SMS authentication client
 */

const { SMSAuth } = require('../src/auth/sms');

describe('SMSAuth', () => {
  const mockApiUrl = 'http://localhost:3008';
  let auth;

  beforeEach(() => {
    auth = new SMSAuth(mockApiUrl);
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('validatePhoneNumber', () => {
    test('should validate correct phone number format', () => {
      expect(SMSAuth.validatePhoneNumber('+1234567890')).toBe(true);
      expect(SMSAuth.validatePhoneNumber('+441234567890')).toBe(true);
    });

    test('should reject invalid phone number format', () => {
      expect(SMSAuth.validatePhoneNumber('1234567890')).toBe(false);
      expect(SMSAuth.validatePhoneNumber('invalid')).toBe(false);
      expect(SMSAuth.validatePhoneNumber('')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    test('should format phone numbers correctly', () => {
      expect(SMSAuth.formatPhoneNumber('2345678901')).toBe('+12345678901');
      expect(SMSAuth.formatPhoneNumber('12345678901')).toBe('+12345678901');
      expect(SMSAuth.formatPhoneNumber('+12345678901')).toBe('+12345678901');
    });

    test('should return null for invalid numbers', () => {
      expect(SMSAuth.formatPhoneNumber('123')).toBe(null);
      expect(SMSAuth.formatPhoneNumber('invalid')).toBe(null);
    });
  });

  describe('token management', () => {
    test('should set and get token', () => {
      const token = 'test_token_123';
      auth.setToken(token);
      
      expect(auth.getToken()).toBe(token);
      expect(auth.isAuthenticated()).toBe(true);
    });

    test('should return null when not authenticated', () => {
      expect(auth.getToken()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });

    test('should logout and clear token', () => {
      auth.setToken('test_token');
      auth.logout();
      
      expect(auth.getToken()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('getAuthHeaders', () => {
    test('should return authorization header with token', () => {
      auth.setToken('test_token');
      const headers = auth.getAuthHeaders();
      
      expect(headers).toEqual({
        'Authorization': 'Bearer test_token'
      });
    });

    test('should return header with null token when not set', () => {
      const headers = auth.getAuthHeaders();
      
      expect(headers).toEqual({
        'Authorization': 'Bearer null'
      });
    });
  });
});
