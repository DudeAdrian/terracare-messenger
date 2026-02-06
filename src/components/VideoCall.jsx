/**
 * VideoCall Component
 * 
 * WebRTC video call UI component
 */

import React, { useEffect, useRef, useState } from 'react';
import { VideoCall as VideoCallManager } from '../webrtc';

function VideoCall({ socket, userId, remoteUserId, isIncoming = false, onCallEnd, onCallError }) {
  const [callState, setCallState] = useState(isIncoming ? 'incoming' : 'connecting');
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callManagerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    initCall();

    return () => {
      cleanup();
    };
  }, []);

  const initCall = async () => {
    try {
      callManagerRef.current = new VideoCallManager(socket, userId);
      
      // Set callbacks
      callManagerRef.current.onIncomingCall = handleIncomingCall;
      callManagerRef.current.onRemoteStream = handleRemoteStream;
      callManagerRef.current.onCallEnded = handleCallEnded;
      callManagerRef.current.onCallError = handleCallError;

      if (!isIncoming) {
        // Outgoing call
        const localStream = await callManagerRef.current.start(remoteUserId);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      } else {
        // Incoming call - just get local stream for preview
        const localStream = await callManagerRef.current.getLocalStream();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
    } catch (error) {
      console.error('[VideoCall] Init error:', error);
      handleCallError({ message: error.message });
    }
  };

  const handleIncomingCall = (data) => {
    // This is handled by parent component for incoming calls
  };

  const handleRemoteStream = (stream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
    setCallState('connected');
    startTimer();
  };

  const handleCallEnded = (data) => {
    stopTimer();
    if (onCallEnd) {
      onCallEnd(data);
    }
  };

  const handleCallError = (error) => {
    if (onCallError) {
      onCallError(error);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const cleanup = () => {
    stopTimer();
    if (callManagerRef.current) {
      callManagerRef.current.cleanup();
    }
  };

  const handleAccept = async () => {
    try {
      await callManagerRef.current.answer();
      setCallState('connecting');
    } catch (error) {
      console.error('[VideoCall] Accept error:', error);
    }
  };

  const handleDecline = () => {
    callManagerRef.current.decline();
    if (onCallEnd) {
      onCallEnd({ reason: 'declined' });
    }
  };

  const handleEnd = () => {
    callManagerRef.current.end();
  };

  const toggleVideo = () => {
    const enabled = callManagerRef.current.toggleVideo();
    setLocalVideoEnabled(enabled);
  };

  const toggleAudio = () => {
    const enabled = callManagerRef.current.toggleAudio();
    setLocalAudioEnabled(enabled);
  };

  const switchCamera = async () => {
    await callManagerRef.current.switchCamera();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState === 'incoming') {
    return (
      <div className="video-call incoming">
        <div className="call-info">
          <div className="caller-avatar">
            {remoteUserId.charAt(0).toUpperCase()}
          </div>
          <h3>Incoming Call</h3>
          <p>{remoteUserId}</p>
        </div>

        <video ref={localVideoRef} autoPlay muted className="local-preview" />

        <div className="call-controls">
          <button className="btn-decline" onClick={handleDecline}>
            <span className="icon">📞</span>
            Decline
          </button>
          <button className="btn-accept" onClick={handleAccept}>
            <span className="icon">📞</span>
            Accept
          </button>
        </div>

        <style jsx>{`
          .video-call {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .call-info {
            text-align: center;
            color: white;
            margin-bottom: 2rem;
          }

          .caller-avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: #4CAF50;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin: 0 auto 1rem;
          }

          .call-info h3 {
            margin: 0 0 0.5rem;
            font-size: 1.5rem;
          }

          .call-info p {
            margin: 0;
            opacity: 0.8;
          }

          .local-preview {
            width: 150px;
            height: 200px;
            border-radius: 12px;
            object-fit: cover;
            margin-bottom: 2rem;
          }

          .call-controls {
            display: flex;
            gap: 2rem;
          }

          .call-controls button {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
          }

          .call-controls button:hover {
            transform: scale(1.05);
          }

          .btn-decline {
            background: #f44336;
            color: white;
          }

          .btn-accept {
            background: #4CAF50;
            color: white;
          }

          .icon {
            font-size: 1.5rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="video-call">
      <div className="call-status">
        <span className="call-state">{callState === 'connected' ? 'Connected' : 'Connecting...'}</span>
        {callState === 'connected' && (
          <span className="call-duration">{formatDuration(callDuration)}</span>
        )}
      </div>

      <video 
        ref={remoteVideoRef} 
        autoPlay 
        className="remote-video"
      />

      <video 
        ref={localVideoRef} 
        autoPlay 
        muted 
        className="local-video"
      />

      <div className="call-controls">
        <button 
          className={`control-btn ${!localAudioEnabled ? 'muted' : ''}`}
          onClick={toggleAudio}
        >
          {localAudioEnabled ? '🎤' : '🎤❌'}
        </button>
        
        <button 
          className={`control-btn ${!localVideoEnabled ? 'muted' : ''}`}
          onClick={toggleVideo}
        >
          {localVideoEnabled ? '📹' : '📹❌'}
        </button>

        <button className="control-btn" onClick={switchCamera}>
          🔄
        </button>

        <button className="control-btn btn-end" onClick={handleEnd}>
          📞
        </button>
      </div>

      <style jsx>{`
        .video-call {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #1a1a2e;
          z-index: 1000;
        }

        .call-status {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 1rem;
          color: white;
          z-index: 10;
        }

        .remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .local-video {
          position: absolute;
          bottom: 100px;
          right: 20px;
          width: 120px;
          height: 160px;
          border-radius: 12px;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .call-controls {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 1rem;
        }

        .control-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .control-btn.muted {
          background: #f44336;
        }

        .control-btn.btn-end {
          background: #f44336;
          transform: rotate(135deg);
        }

        .control-btn.btn-end:hover {
          background: #d32f2f;
        }
      `}</style>
    </div>
  );
}

export default VideoCall;
