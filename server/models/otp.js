/**
 * OTP Model
 * 
 * Manages one-time passwords for SMS authentication
 * Uses in-memory store (replace with Redis in production)
 */

const crypto = require('crypto');

// In-memory OTP store (key: phoneNumber, value: { otp, expiresAt, attempts })
const otpStore = new Map();

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

/**
 * Generate a random OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - E.164 formatted phone number
 * @returns {Promise<Object>} OTP details
 */
async function sendOTP(phoneNumber) {
  // Generate new OTP
  const otp = generateOTP();
  const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP
  otpStore.set(phoneNumber, {
    otp,
    expiresAt,
    attempts: 0
  });

  // In development, log OTP to console
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OTP] ${phoneNumber}: ${otp}`);
  }

  // TODO: Integrate with Twilio/AWS SNS for production
  // const twilio = require('twilio')(accountSid, authToken);
  // await twilio.messages.create({
  //   body: `Your Terracare Messenger code: ${otp}`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phoneNumber
  // });

  return {
    otp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    expiresIn: OTP_EXPIRY_MINUTES * 60
  };
}

/**
 * Verify OTP for phone number
 * @param {string} phoneNumber - E.164 formatted phone number
 * @param {string} otp - OTP to verify
 * @returns {Promise<boolean>} Verification result
 */
async function verifyOTP(phoneNumber, otp) {
  const stored = otpStore.get(phoneNumber);

  if (!stored) {
    return false;
  }

  // Check expiry
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phoneNumber);
    return false;
  }

  // Check max attempts
  if (stored.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(phoneNumber);
    return false;
  }

  // Verify OTP
  if (stored.otp !== otp) {
    stored.attempts += 1;
    return false;
  }

  // Success - delete OTP
  otpStore.delete(phoneNumber);
  return true;
}

/**
 * Get OTP (for testing only)
 * @param {string} phoneNumber - Phone number
 * @returns {Object|null} OTP details or null
 */
function getOTP(phoneNumber) {
  return otpStore.get(phoneNumber) || null;
}

/**
 * Clean up expired OTPs
 */
function cleanupExpiredOTPs() {
  const now = Date.now();
  for (const [phoneNumber, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(phoneNumber);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = {
  sendOTP,
  verifyOTP,
  getOTP,
  generateOTP
};
