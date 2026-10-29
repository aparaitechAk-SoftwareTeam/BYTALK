import React from 'react';
import { RTCView } from 'react-native-webrtc';

export default function RtcVideoView({ stream, muted = false, mirror = false, style, accessibleLabel }) {
  if (!stream) return null;
  return (
    <RTCView
      streamURL={stream.toURL()}
      mirror={mirror}
      objectFit="cover"
      style={style}
      accessibilityLabel={accessibleLabel}
    />
  );
}

