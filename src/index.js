/**
 * Terracare Messenger Client SDK
 * 
 * Main entry point for the messenger client library
 */

const { SMSAuth } = require('./auth');
const { MessagingClient } = require('./messaging');
const { VideoCall } = require('./webrtc');
const { Web3Wallet } = require('./wallet');
const { SignalProtocol } = require('./encryption');

module.exports = {
  // Authentication
  SMSAuth,
  
  // Messaging
  MessagingClient,
  
  // WebRTC
  VideoCall,
  
  // Wallet
  Web3Wallet,
  
  // Encryption
  SignalProtocol,
  
  // Version
  version: '1.0.0'
};
