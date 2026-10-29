import { registerGlobals } from '@livekit/react-native';
import { createLocalAudioTrack, Room, RoomEvent } from 'livekit-client';

registerGlobals();

export async function connectLiveRoom({ url, token, onEvent }) {
  const room = new Room();
  const handleTrackSubscribed = (track, publication, participant) => {
    if (track.kind === 'audio') onEvent?.({ type: 'track-subscribed', participantId: participant.identity });
  };
  room
    .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => onEvent?.({ type: 'track-unsubscribed', participantId: participant.identity }))
    .on(RoomEvent.ParticipantConnected, (participant) => onEvent?.({ type: 'participant-joined', participant }))
    .on(RoomEvent.ParticipantDisconnected, (participant) => onEvent?.({ type: 'participant-left', participant }))
    .on(RoomEvent.ConnectionStateChanged, (state) => onEvent?.({ type: 'connection', state }))
    .on(RoomEvent.Disconnected, (reason) => onEvent?.({ type: 'disconnected', reason }));

  await room.connect(url, token);
  const microphone = await createLocalAudioTrack();
  await room.localParticipant.publishTrack(microphone);
  onEvent?.({ type: 'connected', room });

  return {
    room,
    microphone,
    setMuted: (muted) => microphone.mute(muted),
    disconnect: () => {
      microphone.stop();
      room.disconnect();
    },
  };
}
