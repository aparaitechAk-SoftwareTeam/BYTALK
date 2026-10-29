import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';

export default function CallVideo({ stream, label, style, mirror = false }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stream) return undefined;

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = mirror;
    video.srcObject = stream;
    Object.assign(video.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transform: mirror ? 'scaleX(-1)' : 'none',
      backgroundColor: '#17172F',
    });
    container.appendChild(video);
    video.play().catch(() => {
      video.controls = true;
    });
    return () => {
      video.pause();
      video.srcObject = null;
      if (container.contains(video)) container.removeChild(video);
    };
  }, [stream, mirror]);

  return (
    <View ref={containerRef} style={style}>
      {!stream && <Text style={{ color: '#FFFFFF', textAlign: 'center', paddingTop: 16 }}>{label}</Text>}
    </View>
  );
}
