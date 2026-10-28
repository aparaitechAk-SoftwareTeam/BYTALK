import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

export default function RtcVideoView({ stream, muted = false, mirror = false, style, accessibleLabel }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stream) return undefined;
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = muted;
    video.srcObject = stream;
    video.dataset.bytalkRemoteStream = String(!muted);
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.transform = mirror ? 'scaleX(-1)' : 'none';
    container.replaceChildren(video);
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
      video.remove();
    };
  }, [stream, muted, mirror]);

  return (
    <View
      ref={containerRef}
      style={style}
      accessible
      accessibilityLabel={accessibleLabel}
      onLayout={() => {}}
    />
  );
}

