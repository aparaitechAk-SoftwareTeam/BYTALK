import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

export async function getLocalMediaStream(type) {
  try {
    return await mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { facingMode: 'user' } : false,
    });
  } catch (error) {
    if (type !== 'video') throw error;
    return mediaDevices.getUserMedia({ audio: true, video: false });
  }
}

export function createPeerConnection(iceServers) {
  return new RTCPeerConnection({ iceServers });
}

export function makeSessionDescription(description) {
  return new RTCSessionDescription(description);
}

export function makeIceCandidate(candidate) {
  return new RTCIceCandidate(candidate);
}

export function switchCamera(stream) {
  const track = stream?.getVideoTracks()[0];
  if (!track?._switchCamera) throw new Error('Camera switching is unavailable on this device.');
  track._switchCamera();
}

export function startAudioRoute(type, speakerEnabled) {
  InCallManager.start({ media: type });
  InCallManager.setForceSpeakerphoneOn(speakerEnabled);
}

export function setAudioRoute(speakerEnabled) {
  InCallManager.setForceSpeakerphoneOn(speakerEnabled);
}

export function stopAudioRoute() {
  InCallManager.stop();
}
