/**
 * One `RTCPeerConnection` and the signalling around it.
 *
 * The state machine in `manager.ts` owns *what the call is*; this owns *the
 * media session* — the offer/answer exchange, trickled ICE, and the tracks. It
 * knows nothing about accounts, envelopes or React, which is what keeps the
 * negotiation in one readable place.
 */

export type CallSessionEvents = {
  /** A locally gathered candidate, to be trickled to the peer as it is found. */
  onIceCandidate: (candidate: RTCIceCandidateInit) => void
  /** The media path is up; this is when the call really started. */
  onConnected: () => void
  /** ICE gave up. The call cannot recover. */
  onFailed: (detail: string) => void
  /** The remote stream gained a track; the same object is reported each time. */
  onRemoteStream: (stream: MediaStream) => void
  /** A remote *video* track arrived, so the screen can drop the avatar. */
  onRemoteVideo: () => void
}

export class CallSession {
  private readonly pc: RTCPeerConnection
  private readonly events: CallSessionEvents
  private readonly remoteStream = new MediaStream()
  /**
   * Candidates that arrived before the remote description did.
   *
   * Not an optimisation — a necessity. The caller trickles candidates the moment
   * the offer goes out, and the callee only has a peer connection once somebody
   * answers; `addIceCandidate` before `setRemoteDescription` is an outright
   * error, and dropping them would lose the connectivity check that gets through
   * a NAT.
   */
  private readonly pending: RTCIceCandidateInit[] = []
  private hasRemoteDescription = false
  private closed = false

  constructor(iceServers: RTCIceServer[], localStream: MediaStream, events: CallSessionEvents) {
    this.events = events
    this.pc = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' })

    for (const track of localStream.getTracks()) {
      this.pc.addTrack(track, localStream)
    }

    this.pc.onicecandidate = (event) => {
      if (event.candidate !== null && !this.closed) {
        this.events.onIceCandidate(event.candidate.toJSON())
      }
    }

    this.pc.ontrack = (event) => {
      const track = event.track
      if (!this.remoteStream.getTracks().includes(track)) {
        this.remoteStream.addTrack(track)
      }
      this.events.onRemoteStream(this.remoteStream)
      if (track.kind === 'video') {
        this.events.onRemoteVideo()
      }
    }

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState
      if (state === 'connected') {
        this.events.onConnected()
      } else if (state === 'failed') {
        this.events.onFailed('connection_state_failed')
      }
    }

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'failed') {
        this.events.onFailed('ice_connection_failed')
      }
    }
  }

  /** The caller's half of the handshake; returns the SDP to send. */
  async createOffer(): Promise<string> {
    await this.pc.setLocalDescription(await this.pc.createOffer())
    return this.requireLocalSdp()
  }

  /** The callee's half: apply the offer, then return the SDP to send back. */
  async acceptOffer(sdp: string): Promise<string> {
    await this.setRemote({ type: 'offer', sdp })
    await this.pc.setLocalDescription(await this.pc.createAnswer())
    return this.requireLocalSdp()
  }

  async acceptAnswer(sdp: string): Promise<void> {
    await this.setRemote({ type: 'answer', sdp })
  }

  /**
   * Adds a remote candidate, queuing it if the remote description is not in yet.
   *
   * The queue is drained in a loop rather than once: awaiting the first
   * `addIceCandidate` lets an `onicecandidate`-style delivery append to it.
   */
  async addRemoteCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.closed) {
      return
    }
    if (!this.hasRemoteDescription) {
      this.pending.push(candidate)
      return
    }
    await this.pc.addIceCandidate(candidate)
  }

  /** Enables or disables the outgoing video without touching the audio. */
  setVideoEnabled(enabled: boolean): void {
    const track = this.videoSender()?.track
    if (track !== undefined && track !== null) {
      track.enabled = enabled
    }
  }

  /**
   * Points the video sender at a different camera's track.
   *
   * `replaceTrack` rather than a renegotiation: the m-line, the SSRC and the
   * negotiated codec all stay as they are, so the switch is instant and the peer
   * sees nothing but a new picture.
   */
  async replaceVideoTrack(track: MediaStreamTrack): Promise<void> {
    const sender = this.videoSender()
    if (sender === undefined) {
      return
    }
    await sender.replaceTrack(track)
  }

  close(): void {
    if (this.closed) {
      return
    }
    this.closed = true
    this.pc.onicecandidate = null
    this.pc.ontrack = null
    this.pc.onconnectionstatechange = null
    this.pc.oniceconnectionstatechange = null
    this.pc.close()
  }

  private async setRemote(description: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(description)
    this.hasRemoteDescription = true
    while (this.pending.length > 0) {
      const candidate = this.pending.shift()
      if (candidate !== undefined) {
        await this.pc.addIceCandidate(candidate)
      }
    }
  }

  private videoSender(): RTCRtpSender | undefined {
    return this.pc.getSenders().find((sender) => sender.track?.kind === 'video')
  }

  private requireLocalSdp(): string {
    const sdp = this.pc.localDescription?.sdp
    if (sdp === undefined || sdp.length === 0) {
      throw new Error('[calls] the peer connection produced no local description')
    }
    return sdp
  }
}
