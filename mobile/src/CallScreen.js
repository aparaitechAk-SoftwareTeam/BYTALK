import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RtcVideoView from './RtcVideoView';
import {
  createIceCandidate,
  createMediaStream,
  createPeerConnection,
  createSessionDescription,
  getUserMedia,
  setSpeakerEnabled,
  startAudioRoute,
  stopAudioRoute,
  supportsSpeakerToggle,
  switchCamera,
} from './rtc';

const orange = '#FF693D';
const navy = '#17172F';

export default function CallScreen({ socket, userId, call, onCallState, onCallEnded }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [speakerSupported, setSpeakerSupported] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const cameraFacingRef = useRef('environment');
  const callRef = useRef(call);
  const callbacksRef = useRef({ onCallState, onCallEnded });

  callRef.current = call;
  callbacksRef.current = { onCallState, onCallEnded };

  useEffect(() => {
    let active = true;
    supportsSpeakerToggle().then((supported) => {
      if (active) setSpeakerSupported(supported);
    }).catch(() => setSpeakerSupported(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (call.phase !== 'connected' || !call.connectedAt) {
      setDuration(0);
      return undefined;
    }
    const updateDuration = () => setDuration(Math.max(0, Math.floor((Date.now() - Date.parse(call.connectedAt)) / 1000)));
    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [call.phase, call.connectedAt]);

  useEffect(() => {
    if (!socket) return undefined;
    const matchingCall = (data) => data?.callId === call.id;
    const onAccepted = (data) => {
      if (matchingCall(data) && callRef.current.role === 'caller') {
        callbacksRef.current.onCallState({ phase: 'connecting' });
      }
    };
    const onSignal = (data) => {
      if (!matchingCall(data)) return;
      const peer = peerRef.current;
      if (!peer) {
        if (data.kind === 'offer') pendingOfferRef.current = data.signal;
        if (data.kind === 'ice') pendingCandidatesRef.current.push(data.signal);
        return;
      }
      if (data.kind === 'offer') {
        pendingOfferRef.current = data.signal;
        if (localStreamRef.current) handleOffer(peer, data.signal);
      } else if (data.kind === 'answer') {
        applyRemoteDescription(peer, data.signal).catch(showError);
      } else if (data.kind === 'ice') {
        addCandidate(peer, data.signal);
      }
    };
    const onCallStateEvent = (data) => {
      if (!matchingCall(data)) return;
      if (data.status === 'connected') {
        callbacksRef.current.onCallState({ phase: 'connected', connectedAt: data.connectedAt });
      } else if (data.status === 'reconnecting') {
        callbacksRef.current.onCallState({ phase: 'reconnecting' });
      }
    };
    const onRejected = (data) => {
      if (matchingCall(data)) callbacksRef.current.onCallEnded('rejected');
    };
    const onEnded = (data) => {
      if (matchingCall(data)) callbacksRef.current.onCallEnded(data.status || 'ended');
    };
    socket.on('call:accepted', onAccepted);
    socket.on('call:signal', onSignal);
    socket.on('call:state', onCallStateEvent);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);
    socket.on('call:missed', onEnded);
    return () => {
      socket.off('call:accepted', onAccepted);
      socket.off('call:signal', onSignal);
      socket.off('call:state', onCallStateEvent);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
      socket.off('call:missed', onEnded);
    };
  }, [socket, call.id]);

  const emitSignal = (kind, signal) => new Promise((resolve, reject) => {
    socket.emit('call:signal', { callId: call.id, kind, signal }, (response) => {
      if (response?.error) reject(new Error(response.error));
      else resolve();
    });
  });

  const showError = (reason) => {
    const message = reason?.message || 'The call connection could not be established.';
    setError(message);
    setConnecting(false);
    if (callRef.current.phase === 'connecting') {
      socket.emit('call:end', { callId: callRef.current.id });
    }
  };

  const addCandidate = async (peer, candidate) => {
    if (!peer.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await peer.addIceCandidate(createIceCandidate(candidate));
    } catch (reason) {
      showError(reason);
    }
  };

  const applyRemoteDescription = async (peer, description) => {
    await peer.setRemoteDescription(createSessionDescription(description));
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      await peer.addIceCandidate(createIceCandidate(candidate));
    }
  };

  const handleOffer = async (peer, offer) => {
    try {
      if (!peer.remoteDescription) {
        await applyRemoteDescription(peer, offer);
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await emitSignal('answer', peer.localDescription.toJSON ? peer.localDescription.toJSON() : peer.localDescription);
      pendingOfferRef.current = null;
    } catch (reason) {
      showError(reason);
    }
  };

  const shouldConnect = ['connecting', 'connected', 'reconnecting'].includes(call.phase);
  useEffect(() => {
    if (!shouldConnect || !socket) return undefined;
    let cancelled = false;
    setConnecting(true);
    setError('');

    async function connectCall() {
      try {
        const config = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000'}/api/rtc-config`, {
          headers: { Authorization: `Bearer ${globalThis.bytalkAuthToken || ''}` },
        }).then(async (response) => {
          if (!response.ok) throw new Error('Could not load secure call configuration.');
          return response.json();
        });
        if (cancelled) return;
        startAudioRoute(call.type);
        const peer = createPeerConnection(config);
        peerRef.current = peer;
        peer.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
            emitSignal('ice', candidate).catch(showError);
          }
        };
        peer.ontrack = (event) => {
          const stream = event.streams?.[0];
          if (stream) setRemoteStream(stream);
          else {
            const combined = remoteStream || createMediaStream();
            combined.addTrack(event.track);
            setRemoteStream(combined);
          }
        };
        peer.onconnectionstatechange = () => {
          if (peer.connectionState === 'connected') {
            setConnecting(false);
            socket.emit('call:connected', { callId: call.id });
          } else if (peer.connectionState === 'disconnected' || peer.connectionState === 'connecting') {
            callbacksRef.current.onCallState({ phase: 'reconnecting' });
          } else if (peer.connectionState === 'failed') {
            showError(new Error('The call connection failed. Check your network or TURN configuration.'));
          }
        };

        const stream = await getUserMedia(call.type === 'video');
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        if (call.role === 'caller') {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await emitSignal('offer', peer.localDescription.toJSON ? peer.localDescription.toJSON() : peer.localDescription);
        } else if (pendingOfferRef.current) {
          await handleOffer(peer, pendingOfferRef.current);
        }
        setConnecting(false);
      } catch (reason) {
        if (!cancelled) {
          const permissionMessage = call.type === 'video'
            ? 'Allow BYTALK to use your microphone and camera, then try the call again.'
            : 'Allow BYTALK to use your microphone, then try the call again.';
          setError(`${reason?.message || 'Permission or connection error.'} ${permissionMessage}`);
          setConnecting(false);
          socket.emit('call:end', { callId: call.id });
        }
      }
    }

    connectCall();
    return () => {
      cancelled = true;
      if (peerRef.current) {
        peerRef.current.onicecandidate = null;
        peerRef.current.ontrack = null;
        peerRef.current.onconnectionstatechange = null;
        peerRef.current.close();
        peerRef.current = null;
      }
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      stopAudioRoute();
    };
  }, [call.id, call.role, call.type, shouldConnect, socket]);

  const answerCall = () => {
    setError('');
    socket.emit('call:accept', { callId: call.id }, (response) => {
      if (response?.error) {
        setError(response.error);
        callbacksRef.current.onCallEnded('missed');
        return;
      }
      callbacksRef.current.onCallState({ phase: 'connecting' });
    });
  };

  const declineCall = () => {
    socket.emit('call:reject', { callId: call.id }, () => callbacksRef.current.onCallEnded('rejected'));
  };

  const endCall = () => {
    socket.emit('call:end', { callId: call.id }, () => callbacksRef.current.onCallEnded('ended'));
  };

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
  };

  const toggleSpeaker = async () => {
    try {
      const next = !speakerEnabled;
      const changed = await setSpeakerEnabled(next, call.type);
      if (changed) setSpeakerEnabled(next);
    } catch (reason) {
      setError(reason?.message || 'Unable to change audio output.');
    }
  };

  const changeCamera = async () => {
    try {
      cameraFacingRef.current = cameraFacingRef.current === 'user' ? 'environment' : 'user';
      const next = await switchCamera(localStreamRef.current, peerRef.current, cameraFacingRef.current);
      setLocalStream(null);
      setTimeout(() => setLocalStream(next), 0);
    } catch (reason) {
      setError(reason?.message || 'Unable to switch camera.');
    }
  };

  const formatDuration = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const statusText = {
    incoming: 'Incoming call',
    ringing: call.role === 'caller' ? 'Calling...' : 'Ringing...',
    connecting: 'Connecting securely...',
    connected: formatDuration(duration),
    reconnecting: 'Reconnecting...',
  }[call.phase] || call.phase || 'Connecting...';
  const isIncoming = call.phase === 'incoming';

  return (
    <View style={{ flex: 1, backgroundColor: '#11131D', padding: 20, justifyContent: 'center', alignItems: 'center' }}>
      {call.type === 'video' && call.phase !== 'incoming' && (
        <>
          <RtcVideoView
            stream={remoteStream}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: remoteStream ? 1 : 0 }}
            accessibleLabel={`${call.partner.name}'s video`}
          />
          {(!remoteStream || !remoteStream.getVideoTracks().some((track) => track.enabled && track.readyState === 'live')) && (
            <View style={{ alignItems: 'center', marginBottom: 170 }}>
              <Text style={{ fontSize: 74 }}>{call.partner.avatar || '👤'}</Text>
              <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 14 }}>
                {call.phase === 'connecting' || call.phase === 'reconnecting'
                  ? 'Waiting for video...'
                  : `${call.partner.name}'s camera is off or unavailable.`}
              </Text>
            </View>
          )}
          {localStream && cameraEnabled && (
            <RtcVideoView
              stream={localStream}
              muted
              mirror
              accessibleLabel="Your camera preview"
              style={{ position: 'absolute', top: 28, right: 20, width: 110, height: 156, overflow: 'hidden', borderRadius: 16, borderWidth: 2, borderColor: '#FFFFFF' }}
            />
          )}
        </>
      )}
      {call.type === 'audio' && <Text style={{ fontSize: 86, marginBottom: 18 }}>{call.partner.avatar || '👤'}</Text>}
      <View style={{ alignItems: 'center', marginTop: call.type === 'video' ? 240 : 0 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>{call.partner.name}</Text>
        <Text style={{ color: '#D5D5DF', marginTop: 8, fontSize: 15 }}>{statusText}</Text>
        {connecting && <ActivityIndicator color={orange} style={{ marginTop: 14 }} />}
        {!!error && <Text accessibilityRole="alert" style={{ color: '#FFB5A7', marginTop: 14, textAlign: 'center' }}>{error}</Text>}
      </View>
      {isIncoming ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 44, gap: 36 }}>
          <CallControl icon="call" label="Accept call" color="#168653" onPress={answerCall} />
          <CallControl icon="call" label="Decline call" color="#D92D20" onPress={declineCall} rotate />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 44, gap: 14 }}>
          <CallControl icon={muted ? 'mic-off' : 'mic'} label={muted ? 'Unmute microphone' : 'Mute microphone'} active={muted} onPress={toggleMute} />
          {speakerSupported && (
            <CallControl icon={speakerEnabled ? 'volume-high' : 'volume-medium'} label={speakerEnabled ? 'Use other audio output' : 'Use speaker'} active={!speakerEnabled} onPress={toggleSpeaker} />
          )}
          {call.type === 'video' && (
            <>
              <CallControl icon={cameraEnabled ? 'videocam' : 'videocam-off'} label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'} active={!cameraEnabled} onPress={toggleCamera} />
              {Platform.OS !== 'web' && <CallControl icon="camera-reverse" label="Switch camera" onPress={changeCamera} />}
            </>
          )}
          <CallControl icon="call" label="End call" color="#D92D20" onPress={endCall} />
        </View>
      )}
    </View>
  );
}

function CallControl({ icon, label, onPress, color = '#424552', active = false, rotate = false }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 58, height: 58, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}
    >
      <Ionicons name={icon} size={24} color={active ? '#FFFFFF' : '#FFFFFF'} style={rotate ? { transform: [{ rotate: '135deg' }] } : undefined} />
      <Text style={{ position: 'absolute', top: 64, color: '#E5E5EC', fontSize: 10, width: 86, textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
}

