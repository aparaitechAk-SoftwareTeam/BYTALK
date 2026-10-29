import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

export default function CallAudio({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    audio.srcObject = stream || null;
    if (stream) {
      audio.play().catch((error) => {
        console.warn('[BYTALK call] remote audio playback blocked', error?.message || 'autoplay denied');
      });
    }
    return () => {
      audio.pause();
      audio.srcObject = null;
    };
  }, [stream]);

  return (
    <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
      <audio ref={audioRef} autoPlay playsInline />
    </View>
  );
}
