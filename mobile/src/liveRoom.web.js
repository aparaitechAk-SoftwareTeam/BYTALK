import { createLocalAudioTrack, Room, RoomEvent } from 'livekit-client';

function attachAudioTrack(track) {
  if (typeof document === 'undefined' || !track?.attach) return;
  const elements = track.attach();
  elements.forEach((element) => {
    element.autoplay = true;
    element.playsInline = true;
    element.dataset.bytalkRoomAudio = 'true';
    document.body.appendChild(element);
    element.play().catch(() => {});
  });
}

function detachAudioTrack(track) {
  if (!track?.detach) return;
  track.detach().forEach((element) => element.remove());
}

export async function connectLiveRoom({ url, token, onEvent }) {
  const room = new Room();
  const handleTrackSubscribed = (track, publication, participant) => {
    if (track.kind !== 'audio') return;
    attachAudioTrack(track);
    onEvent?.({ type: 'track-subscribed', participantId: participant.identity });
  };
  const handleTrackUnsubscribed = (track, publication, participant) => {
    if (track.kind === 'audio') detachAudioTrack(track);
    onEvent?.({ type: 'track-unsubscribed', participantId: participant.identity });
  };
  room
    .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    .on(RoomEvent.ParticipantConnected, (participant) => onEvent?.({ type: 'participant-joined', participant }))
    .on(RoomEvent.ParticipantDisconnected, (participant) => onEvent?.({ type: 'participant-left', participant }))
    .on(RoomEvent.ConnectionStateChanged, (state) => onEvent?.({ type: 'connection', state }))
    .on(RoomEvent.Disconnected, (reason) => onEvent?.({ type: 'disconnected', reason }));

  await room.connect(url, token);
  const microphone = await createLocalAudioTrack();
  await room.localParticipant.publishTrack(microphone);
  room.remoteParticipants.forEach((participant) => {
    participant.audioTrackPublications.forEach((publication) => {
      if (publication.track) attachAudioTrack(publication.track);
    });
  });
  onEvent?.({ type: 'connected', room });

  return {
    room,
    microphone,
    setMuted: (muted) => microphone.mute(muted),
    disconnect: () => {
      detachAudioTrack(microphone);
      room.remoteParticipants.forEach((participant) => participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) detachAudioTrack(publication.track);
      }));
      microphone.stop();
      room.disconnect();
    },
  };
}
