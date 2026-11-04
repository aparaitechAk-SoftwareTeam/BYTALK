import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryModal({
  visible,
  onClose,
  callHistory = [],
  aiSessions = [],
}) {
  const DEFAULT_SESSIONS = [
    {
      id: 's1',
      topic: 'Talk about anything',
      duration: '4m 32s',
      date: 'Today, 11:20 AM',
      type: 'AI Practice',
      rating: 5,
    },
    {
      id: 's2',
      topic: 'Daily routine',
      duration: '6m 15s',
      date: 'Yesterday, 4:45 PM',
      type: 'AI Practice',
      rating: 5,
    },
    {
      id: 's3',
      topic: 'English Speaking Exchange',
      duration: '8m 20s',
      date: 'Oct 30, 2:10 PM',
      type: 'Peer Call',
      rating: 4,
    },
  ];

  const sessions = aiSessions.length > 0 ? aiSessions : DEFAULT_SESSIONS;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="time" size={22} color="#5843E8" />
              <Text style={styles.modalTitle}>Practice & Call History</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close history"
            >
              <Ionicons name="close" size={22} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {sessions.map((item, i) => (
              <View key={item.id || i} style={styles.historyItemCard}>
                <View style={styles.historyTopRow}>
                  <Text style={styles.historyTopicText}>{item.topic}</Text>
                  <View style={styles.historyTypeTag}>
                    <Text style={styles.historyTypeTagText}>{item.type}</Text>
                  </View>
                </View>

                <View style={styles.historyBottomRow}>
                  <Text style={styles.historyDateText}>{item.date}</Text>
                  <View style={styles.ratingDurationRow}>
                    <Text style={styles.historyDurationText}>{item.duration}</Text>
                    {item.rating && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                        <Text style={{ fontSize: 11 }}>⭐</Text>
                        <Text style={styles.ratingText}>{item.rating}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  historyItemCard: {
    backgroundColor: '#FAF9FE',
    borderWidth: 1,
    borderColor: '#ECEBF5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTopicText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1A1D2E',
    flex: 1,
  },
  historyTypeTag: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyTypeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5843E8',
  },
  historyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  historyDateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  ratingDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDurationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: 2,
  },
});
