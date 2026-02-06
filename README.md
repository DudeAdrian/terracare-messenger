# Terracare Messenger

> **Secure Communication Layer for TerraCare** — *Privacy-First Messaging*

[![Version](https://img.shields.io/badge/version-v1.0.0-blue)](https://github.com/DudeAdrian/terracare-messenger/releases/tag/v1.0.0)
[![TerraCare](https://img.shields.io/badge/TerraCare-Communication%20Layer-green)](https://github.com/DudeAdrian/Terracare-Ledger)
[![License](https://img.shields.io/badge/license-MIT-yellow)](./LICENSE)

---

## Purpose

Terracare Messenger provides a **secure, private communication layer** for the TerraCare ecosystem. Built with privacy at its core, it enables text, voice, and video communication with end-to-end encryption, while seamlessly integrating with TerraCare's identity and token systems.

### Key Features

- **Phone Number + SMS Login**: Simple, secure authentication
- **Text, Voice, Video Messaging**: Rich multimedia communication
- **Video Calls (WebRTC)**: Peer-to-peer secure video conferencing
- **E2E Encryption**: End-to-end encryption for all communications
- **Progressive Web3**: Optional wallet integration for decentralized identity

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client (PWA)                                │
│  ┌────────────┬────────────┬────────────┬────────────────────┐  │
│  │   Auth     │ Messaging  │  WebRTC    │   Web3 Wallet      │  │
│  │ (SMS/OTP)  │ (Text/Voice│  (Video)   │   (Optional)       │  │
│  └────────────┴────────────┴────────────┴────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ E2E Encrypted
┌──────────────────────────▼──────────────────────────────────────┐
│                    Terracare Messenger                           │
│  ┌──────────────┬──────────────┬─────────────────────────────┐  │
│  │  Signal      │  WebRTC      │   TerraCare                 │  │
│  │  Protocol    │  Signaling   │   Integration               │  │
│  │  (E2E)       │  Server      │   (Identity/Tokens)         │  │
│  └──────────────┴──────────────┴─────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  TerraCare Ledger                                │
│         (IdentityRegistry, TokenEngine, RevenueDistributor)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React + TypeScript |
| **E2E Encryption** | Signal Protocol (libsignal-protocol-javascript) |
| **Video Calls** | WebRTC + Simple-Peer |
| **Backend** | Node.js + Express + Socket.io |
| **SMS** | Twilio / AWS SNS |
| **Storage** | IndexedDB (client), IPFS (optional) |
| **Web3** | ethers.js, WalletConnect |

---

## Quickstart

### Prerequisites

- Node.js 18+
- Twilio account (for SMS)
- MongoDB (optional, for message persistence)

### Installation

```bash
git clone https://github.com/DudeAdrian/terracare-messenger.git
cd terracare-messenger
npm install
```

### Configuration

Create a `.env` file:

```env
# Server
PORT=3008
NODE_ENV=development

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# TerraCare Integration
TERRACARE_RPC_URL=http://localhost:8545
IDENTITY_REGISTRY_ADDRESS=0x...

# WebRTC (STUN/TURN servers)
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=turn:your-turn-server.com
TURN_USERNAME=username
TURN_PASSWORD=password

# Web3
WALLET_CONNECT_PROJECT_ID=your_project_id
```

### Running

```bash
# Development (both client and server)
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test
```

---

## Features

### 1. Phone Number + SMS Login

```javascript
// Request OTP
const { requestOTP } = require('./src/auth/sms');
await requestOTP('+1234567890');

// Verify OTP
const { verifyOTP } = require('./src/auth/sms');
const token = await verifyOTP('+1234567890', '123456');
```

### 2. End-to-End Encryption

Uses the Signal Protocol for secure messaging:
- X3DH Key Agreement
- Double Ratchet Algorithm
- Pre-keys for offline messaging

```javascript
// Initialize Signal Protocol
const { SignalProtocol } = require('./src/encryption/signal');
const protocol = new SignalProtocol();

// Encrypt message
const encrypted = await protocol.encrypt(
  recipientId,
  'Hello, secure world!'
);

// Decrypt message
const decrypted = await protocol.decrypt(
  senderId,
  encrypted
);
```

### 3. WebRTC Video Calls

```javascript
// Start video call
const { VideoCall } = require('./src/webrtc/call');
const call = new VideoCall();
await call.start(recipientId);

// Answer incoming call
await call.answer();

// End call
call.end();
```

### 4. Progressive Web3 (Optional Wallet)

```javascript
// Connect wallet
const { Web3Wallet } = require('./src/wallet/connector');
const wallet = new Web3Wallet();
await wallet.connect();

// Sign message for authentication
const signature = await wallet.signMessage('Sign in to Terracare Messenger');
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/otp/request` | Request SMS OTP |
| POST | `/api/auth/otp/verify` | Verify OTP and get token |
| POST | `/api/auth/wallet` | Authenticate with wallet |

### Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:conversationId` | Get message history |
| POST | `/api/messages/send` | Send encrypted message |
| DELETE | `/api/messages/:id` | Delete message |

### WebRTC Signaling

| Event | Description |
|-------|-------------|
| `call:initiate` | Start video call |
| `call:answer` | Answer video call |
| `call:ice-candidate` | Exchange ICE candidates |
| `call:end` | End video call |

---

## Security

### End-to-End Encryption

All messages are encrypted using the Signal Protocol:
- **Identity Keys**: Ed25519 for identity verification
- **Pre-keys**: X25519 for initial key exchange
- **Session Keys**: AES-256-CBC for message encryption
- **Ratcheting**: Continuous key rotation for forward secrecy

### Privacy Features

- No message storage on servers (optional)
- Self-destructing messages
- Screenshot detection
- Biometric app lock

---

## TerraCare Integration

### Identity Verification

Link your TerraCare identity for enhanced trust:

```javascript
// Link TerraCare identity
const { linkIdentity } = require('./src/auth/tc-integration');
await linkIdentity(walletAddress);
```

### Token-Gated Features

Unlock premium features with TerraCare tokens:

| Feature | Token Requirement |
|---------|------------------|
| Group calls (10+ people) | 100 MINE |
| File sharing (>100MB) | 50 WELL |
| Custom themes | Cooperative Member |

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- test/encryption.test.js
```

---

## Related Projects

| Repository | Description |
|------------|-------------|
| [Terracare-Ledger](https://github.com/DudeAdrian/Terracare-Ledger) | Core blockchain ledger |
| [terracare-seeds](https://github.com/DudeAdrian/terracare-seeds) | Seed layer API |
| [terracare-water](https://github.com/DudeAdrian/terracare-water) | Flow layer API |
| [terracare-energy](https://github.com/DudeAdrian/terracare-energy) | Power layer API |
| [terracare-food](https://github.com/DudeAdrian/terracare-food) | Nourishment layer API |
| [terracare-community](https://github.com/DudeAdrian/terracare-community) | Social layer API |
| [terracare-education](https://github.com/DudeAdrian/terracare-education) | Knowledge layer API |
| [terracare-art](https://github.com/DudeAdrian/terracare-art) | Creative layer API |

---

## License

MIT - See [LICENSE](./LICENSE)

---

> *"Privacy is not something that I'm merely entitled to, it's an absolute prerequisite."*  
> — Marlon Brando
