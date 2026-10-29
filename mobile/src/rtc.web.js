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
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support microphone and camera access.');
  }
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video ? { facingMode: 'user' } : false,
  });
}

export async function switchCamera(stream, peerConnection, facingMode) {
  const replacement = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode },
  });
  const newTrack = replacement.getVideoTracks()[0];
  const oldTrack = stream.getVideoTracks()[0];
  const sender = peerConnection.getSenders().find((item) => item.track === oldTrack);
  if (!sender || !newTrack) {
    replacement.getTracks().forEach((track) => track.stop());
    throw new Error('Unable to switch cameras on this device.');
  }
  await sender.replaceTrack(newTrack);
  oldTrack.stop();
  stream.removeTrack(oldTrack);
  stream.addTrack(newTrack);
  return stream;
}

export async function supportsSpeakerToggle() {
  if (typeof HTMLMediaElement === 'undefined' || !HTMLMediaElement.prototype.setSinkId) return false;
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'audiooutput').length > 1;
}

export async function setSpeakerEnabled(enabled) {
  const element = document.querySelector('[data-bytalk-remote-stream="true"]');
  if (!element?.setSinkId) return false;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter((device) => device.kind === 'audiooutput');
  const output = enabled
    ? outputs.find((device) => device.deviceId === 'default') || outputs[0]
    : outputs.find((device) => device.deviceId !== 'default');
  if (!output) return false;
  await element.setSinkId(output.deviceId);
  return true;
}

export function startAudioRoute() {}

export function stopAudioRoute() {}

