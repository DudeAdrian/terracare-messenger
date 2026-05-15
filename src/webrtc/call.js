/**
 * WebRTC Video Call Implementation
 * 
 * Manages peer-to-peer video calling using WebRTC
 */

class VideoCall {
  constructor(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callId = null;
    this.remoteUserId = null;
    this.isCaller = false;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.onCallError = null;

    // ICE servers configuration
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
        // Add TURN servers for production
        // {
        //   urls: process.env.TURN_SERVER,
        //   username: process.env.TURN_USERNAME,
        //   credential: process.env.TURN_PASSWORD
        // }
      ]
    };

    this.setupSocketListeners();
  }

  /**
   * Setup socket event listeners for WebRTC signaling
   */
  setupSocketListeners() {
    // Incoming call
    this.socket.on('call:incoming', (data) => {
      console.log('[WebRTC] Incoming call from:', data.from);
      this.callId = data.callId;
      this.remoteUserId = data.from;
      this.isCaller = false;
      
      // Emit event for UI to handle
      if (this.onIncomingCall) {
        this.onIncomingCall(data);
      }
    });

    // Call accepted
    this.socket.on('call:accepted', async (data) => {
      console.log('[WebRTC] Call accepted by:', data.by);
      await this.createOffer();
    });

    // Call declined
    this.socket.on('call:declined', (data) => {
      console.log('[WebRTC] Call declined by:', data.by);
      this.cleanup();
      
      if (this.onCallEnded) {
        this.onCallEnded({ reason: 'declined', by: data.by });
      }
    });

    // WebRTC offer
    this.socket.on('call:offer', async (data) => {
      console.log('[WebRTC] Received offer from:', data.from);
      await this.handleOffer(data.offer, data.from);
    });

    // WebRTC answer
    this.socket.on('call:answer', (data) => {
      console.log('[WebRTC] Received answer from:', data.from);
      this.handleAnswer(data.answer);
    });

    // ICE candidate
    this.socket.on('call:ice-candidate', (data) => {
      this.handleIceCandidate(data.candidate);
    });

    // Call ended
    this.socket.on('call:ended', (data) => {
      console.log('[WebRTC] Call ended by:', data.by);
      this.cleanup();
      
      if (this.onCallEnded) {
        this.onCallEnded({ reason: 'ended', by: data.by, duration: data.duration });
      }
    });

    // Call error
    this.socket.on('call:error', (data) => {
      console.error('[WebRTC] Call error:', data.message);
      
      if (this.onCallError) {
        this.onCallError(data);
      }
    });
  }

  /**
   * Initialize peer connection
   */
  async initPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceServers);

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Remote stream received');
      this.remoteStream = event.streams[0];
      
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('call:ice-candidate', {
          callId: this.callId,
          to: this.remoteUserId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection.connectionState);
      
      if (this.peerConnection.connectionState === 'disconnected' ||
          this.peerConnection.connectionState === 'failed') {
        this.end();
      }
    };
  }

  /**
   * Get local media stream
   * @param {Object} constraints - Media constraints
   * @returns {Promise<MediaStream>} Local media stream
   */
  async getLocalStream(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('[WebRTC] Error getting local stream:', error);
      throw error;
    }
  }

  /**
   * Start a video call
   * @param {string} recipientId - User to call
   * @returns {Promise<void>}
   */
  async start(recipientId) {
    try {
      this.remoteUserId = recipientId;
      this.isCaller = true;
      this.callId = `call-${Date.now()}-${this.userId}`;

      // Initialize peer connection
      await this.initPeerConnection();

      // Get local stream
      await this.getLocalStream();

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Initiate call
      this.socket.emit('call:initiate', {
        to: recipientId,
        callId: this.callId
      });

      console.log('[WebRTC] Call initiated to:', recipientId);
    } catch (error) {
      console.error('[WebRTC] Error starting call:', error);
      throw error;
    }
  }

  /**
   * Answer an incoming call
   * @returns {Promise<void>}
   */
  async answer() {
    try {
      // Initialize peer connection
      await this.initPeerConnection();

      // Get local stream
      await this.getLocalStream();

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Accept call
      this.socket.emit('call:answer', {
        callId: this.callId,
        answer: true
      });

      console.log('[WebRTC] Call answered');
    } catch (error) {
      console.error('[WebRTC] Error answering call:', error);
      throw error;
    }
  }

  /**
   * Decline an incoming call
   */
  decline() {
    this.socket.emit('call:answer', {
      callId: this.callId,
      answer: false
    });
    this.cleanup();
  }

  /**
   * Create and send WebRTC offer
   */
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('call:offer', {
        callId: this.callId,
        to: this.remoteUserId,
        offer: offer
      });

      console.log('[WebRTC] Offer sent');
    } catch (error) {
      console.error('[WebRTC] Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebRTC offer
   * @param {RTCSessionDescriptionInit} offer - WebRTC offer
   * @param {string} from - Sender ID
   */
  async handleOffer(offer, from) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('call:answer-sdp', {
        callId: this.callId,
        to: from,
        answer: answer
      });

      console.log('[WebRTC] Answer sent');
    } catch (error) {
      console.error('[WebRTC] Error handling offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebRTC answer
   * @param {RTCSessionDescriptionInit} answer - WebRTC answer
   */
  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[WebRTC] Remote description set');
    } catch (error) {
      console.error('[WebRTC] Error handling answer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming ICE candidate
   * @param {RTCIceCandidateInit} candidate - ICE candidate
   */
  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('[WebRTC] Error handling ICE candidate:', error);
    }
  }

  /**
   * Toggle video mute
   * @returns {boolean} New video state
   */
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Toggle audio mute
   * @returns {boolean} New audio state
   */
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Get current facing mode
    const settings = videoTrack.getSettings();
    const currentFacing = settings.facingMode || 'user';
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: true
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      const sender = this.peerConnection.getSenders()
        .find(s => s.track && s.track.kind === 'video');
      
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      // Stop old track
      videoTrack.stop();

      // Update local stream
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);
    } catch (error) {
      console.error('[WebRTC] Error switching camera:', error);
    }
  }

  /**
   * End the call
   */
  end() {
    this.socket.emit('call:end', { callId: this.callId });
    this.cleanup();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.callId = null;
    this.remoteUserId = null;
    this.isCaller = false;

    console.log('[WebRTC] Call cleaned up');
  }

  /**
   * Check if user has camera/microphone permissions
   * @returns {Promise<Object>} Permissions status
   */
  static async checkPermissions() {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' });
      const microphone = await navigator.permissions.query({ name: 'microphone' });

      return {
        camera: permissions.state,
        microphone: microphone.state
      };
    } catch (error) {
      console.error('[WebRTC] Error checking permissions:', error);
      return { camera: 'unknown', microphone: 'unknown' };
    }
  }

  /**
   * Get available media devices
   * @returns {Promise<Array>} List of devices
   */
  static async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(d => d.kind === 'videoinput'),
        microphones: devices.filter(d => d.kind === 'audioinput'),
        speakers: devices.filter(d => d.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('[WebRTC] Error getting devices:', error);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }
}

module.exports = {
  VideoCall
};
