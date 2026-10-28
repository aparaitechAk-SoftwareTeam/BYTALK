import React from 'react';
import { View, Text } from 'react-native';
import { RTCView } from 'react-native-webrtc';

export default function CallVideo({ stream, label, style, mirror = false }) {
  if (!stream) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#FFFFFF' }}>{label}</Text>
      </View>
    );
  }

  return (
    <RTCView
      streamURL={stream.toURL()}
      mirror={mirror}
      objectFit="cover"
      style={style}
    />
  );
}
