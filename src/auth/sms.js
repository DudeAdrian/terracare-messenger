/**
 * SMS Authentication
 * 
 * Handles phone number + OTP authentication flow
 */

class SMSAuth {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.token = localStorage.getItem('tc_messenger_token');
  }

  /**
   * Request OTP for phone number
   * @param {string} phoneNumber - E.164 formatted phone number
   * @returns {Promise<Object>} OTP request result
   */
  async requestOTP(phoneNumber) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      return data.data;
    } catch (error) {
      console.error('[SMS:Auth] Request OTP error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and authenticate
   * @param {string} phoneNumber - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise<Object>} Authentication result
   */
  async verifyOTP(phoneNumber, otp) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber, otp })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Store token
      this.token = data.data.token;
      localStorage.setItem('tc_messenger_token', this.token);

      return data.data;
    } catch (error) {
      console.error('[SMS:Auth] Verify OTP error:', error);
      throw error;
    }
  }

  /**
   * Authenticate with wallet
   * @param {string} address - Wallet address
   * @param {string} signature - Signed message
   * @param {string} message - Original message
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateWithWallet(address, signature, message) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address, signature, message })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Store token
      this.token = data.data.token;
      localStorage.setItem('tc_messenger_token', this.token);

      return data.data;
    } catch (error) {
      console.error('[SMS:Auth] Wallet auth error:', error);
      throw error;
    }
  }

  /**
   * Link wallet to existing phone account
   * @param {string} address - Wallet address
   * @param {string} signature - Signed message
   * @returns {Promise<Object>} Link result
   */
  async linkWallet(address, signature) {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/link-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ token: this.token, address, signature })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Update token
      this.token = data.data.token;
      localStorage.setItem('tc_messenger_token', this.token);

      return data.data;
    } catch (error) {
      console.error('[SMS:Auth] Link wallet error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Get stored token
   * @returns {string|null}
   */
  getToken() {
    return this.token;
  }

  /**
   * Set token manually
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('tc_messenger_token', token);
  }

  /**
   * Logout and clear token
   */
  logout() {
    this.token = null;
    localStorage.removeItem('tc_messenger_token');
  }

  /**
   * Get authorization headers
   * @returns {Object}
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`
    };
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean}
   */
  static validatePhoneNumber(phoneNumber) {
    const regex = /^\+[1-9]\d{1,14}$/;
    return regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164
   * @param {string} phoneNumber - Raw phone number
   * @param {string} countryCode - Default country code
   * @returns {string|null} Formatted number or null
   */
  static formatPhoneNumber(phoneNumber, countryCode = '1') {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if missing
    if (cleaned.length === 10) {
      cleaned = countryCode + cleaned;
    }

    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return SMSAuth.validatePhoneNumber(cleaned) ? cleaned : null;
  }
}

module.exports = {
  SMSAuth
};
