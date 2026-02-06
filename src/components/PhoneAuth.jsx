/**
 * PhoneAuth Component
 * 
 * Phone number + SMS OTP authentication UI
 */

import React, { useState } from 'react';
import { SMSAuth } from '../auth';

function PhoneAuth({ apiUrl, onAuthenticated }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone, otp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const auth = new SMSAuth(apiUrl);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Format phone number
      const formatted = SMSAuth.formatPhoneNumber(phoneNumber);
      
      if (!formatted) {
        throw new Error('Invalid phone number format');
      }

      await auth.requestOTP(formatted);
      setStep('otp');
      startCountdown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formatted = SMSAuth.formatPhoneNumber(phoneNumber);
      const result = await auth.verifyOTP(formatted, otp);
      
      if (onAuthenticated) {
        onAuthenticated(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const formatted = SMSAuth.formatPhoneNumber(phoneNumber);
      await auth.requestOTP(formatted);
      startCountdown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-auth">
      <div className="auth-header">
        <h2>Terracare Messenger</h2>
        <p>Secure, private communication</p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleRequestOTP} className="auth-form">
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 234 567 8900"
              disabled={loading}
              required
            />
            <small>Enter your phone number with country code</small>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="auth-form">
          <div className="form-group">
            <label htmlFor="otp">Enter Code</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              disabled={loading}
              required
            />
            <small>
              Code sent to {SMSAuth.formatPhoneNumber(phoneNumber)}
            </small>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          <div className="resend-section">
            {countdown > 0 ? (
              <span>Resend code in {countdown}s</span>
            ) : (
              <button 
                type="button" 
                className="btn-link"
                onClick={handleResendOTP}
                disabled={loading}
              >
                Resend code
              </button>
            )}
          </div>

          <button 
            type="button" 
            className="btn-link back-link"
            onClick={() => setStep('phone')}
          >
            Change phone number
          </button>
        </form>
      )}

      <style jsx>{`
        .phone-auth {
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-header h2 {
          margin: 0 0 0.5rem;
          color: #333;
        }

        .auth-header p {
          margin: 0;
          color: #666;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        label {
          font-weight: 600;
          color: #333;
        }

        input {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
        }

        input:focus {
          outline: none;
          border-color: #4CAF50;
        }

        small {
          color: #666;
          font-size: 0.85rem;
        }

        .btn-primary {
          padding: 0.75rem;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #45a049;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-link {
          background: none;
          border: none;
          color: #4CAF50;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn-link:hover {
          text-decoration: underline;
        }

        .back-link {
          text-align: center;
          color: #666;
        }

        .error-message {
          padding: 0.75rem;
          background: #ffebee;
          color: #c62828;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .resend-section {
          text-align: center;
          color: #666;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

export default PhoneAuth;
