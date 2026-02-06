/**
 * Authentication Routes
 * 
 * Handles SMS OTP and wallet authentication
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

const { sendOTP, verifyOTP, getOTP } = require('../models/otp');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'terracare-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @POST /api/auth/otp/request
 * Request SMS OTP for phone number verification
 */
router.post('/otp/request', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Use E.164 format (+1234567890)'
      });
    }

    const result = await sendOTP(phoneNumber);

    res.json({
      success: true,
      data: {
        message: 'OTP sent successfully',
        expiresIn: result.expiresIn,
        // Only in development
        ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
      }
    });
  } catch (error) {
    console.error('[Auth:OTP:Request]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @POST /api/auth/otp/verify
 * Verify OTP and return JWT token
 */
router.post('/otp/verify', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }

    const isValid = await verifyOTP(phoneNumber, otp);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { phoneNumber, type: 'sms' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        phoneNumber,
        expiresIn: JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('[Auth:OTP:Verify]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @POST /api/auth/wallet
 * Authenticate with Web3 wallet
 */
router.post('/wallet', async (req, res) => {
  try {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      return res.status(400).json({
        success: false,
        error: 'Address, signature, and message are required'
      });
    }

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { address: address.toLowerCase(), type: 'wallet' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        address: address.toLowerCase(),
        expiresIn: JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('[Auth:Wallet]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @POST /api/auth/link-wallet
 * Link wallet to existing phone account
 */
router.post('/link-wallet', async (req, res) => {
  try {
    const { token, address, signature } = req.body;

    if (!token || !address || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Token, address, and signature are required'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'sms') {
      return res.status(400).json({
        success: false,
        error: 'Must be authenticated with SMS first'
      });
    }

    // Verify signature
    const message = `Link wallet to Terracare Messenger: ${decoded.phoneNumber}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Generate new token with both phone and address
    const newToken = jwt.sign(
      {
        phoneNumber: decoded.phoneNumber,
        address: address.toLowerCase(),
        type: 'linked'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token: newToken,
        phoneNumber: decoded.phoneNumber,
        address: address.toLowerCase(),
        expiresIn: JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('[Auth:LinkWallet]', error.message);
    res.status(401).json({
      success: false,
      error: 'Invalid token or signature'
    });
  }
});

module.exports = router;
