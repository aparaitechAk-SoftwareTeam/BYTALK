import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

export function createPeerConnection(configuration) {
  return new RTCPeerConnection(configuration);
}

export function createMediaStream() {
  return new MediaStream();
}

export function createSessionDescription(description) {
  return new RTCSessionDescription(description);
}

export function createIceCandidate(candidate) {
  return new RTCIceCandidate(candidate);
}

export function getUserMedia(video) {
  return mediaDevices.getUserMedia({
    audio: true,
    video: video ? { facingMode: 'user' } : false,
  });
}

export async function switchCamera(stream) {
  const track = stream.getVideoTracks()[0];
  if (typeof track?._switchCamera !== 'function') {
    throw new Error('Camera switching is not supported on this device.');
  }
  track._switchCamera();
  return stream;
}

export async function supportsSpeakerToggle() {
  return true;
}

export async function setSpeakerEnabled(enabled, type) {
  InCallManager.setForceSpeakerphoneOn(enabled);
  return true;
}

export function startAudioRoute(type) {
  InCallManager.start({ media: type === 'video' ? 'video' : 'audio' });
}

export function stopAudioRoute() {
  InCallManager.stop();
}

