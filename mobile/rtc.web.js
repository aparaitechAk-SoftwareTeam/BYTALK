export async function getLocalMediaStream(type) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera and microphone access requires HTTPS or localhost in a supported browser.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { facingMode: 'user' } : false,
    });
  } catch (error) {
    if (type !== 'video') throw error;
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }
}

export function createPeerConnection(iceServers) {
  if (typeof RTCPeerConnection === 'undefined') {
    throw new Error('This browser does not support WebRTC calls.');
  }
  return new RTCPeerConnection({ iceServers });
}

export function makeSessionDescription(description) {
  return new RTCSessionDescription(description);
}

export function makeIceCandidate(candidate) {
  return new RTCIceCandidate(candidate);
}

export async function switchCamera(stream, peerConnection) {
  const currentTrack = stream?.getVideoTracks()[0];
  if (!currentTrack) throw new Error('No active camera is available.');

  const facingMode = currentTrack.getSettings().facingMode === 'user' ? 'environment' : 'user';
  const nextStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode },
  });
  const nextTrack = nextStream.getVideoTracks()[0];
  const sender = peerConnection?.getSenders().find((item) => item.track?.kind === 'video');
  if (sender) await sender.replaceTrack(nextTrack);
  stream.removeTrack(currentTrack);
  currentTrack.stop();
  stream.addTrack(nextTrack);
}

export function startAudioRoute() {}
export function setAudioRoute() {}
export function stopAudioRoute() {}
