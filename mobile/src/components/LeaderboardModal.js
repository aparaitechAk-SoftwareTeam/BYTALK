import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

const TOP_LEARNERS = [
  {
    rank: 1,
    name: 'Amina Al-Mansoor',
    country: 'UAE 🇦🇪',
    streak: 42,
    minutes: 320,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    color: '#FFB800',
  },
  {
    rank: 2,
    name: 'Prateek Pawar (You)',
    country: 'India 🇮🇳',
    streak: 28,
    minutes: 275,
    avatar: DEFAULT_AVATAR,
    color: '#38BDF8',
  },
  {
    rank: 3,
    name: 'Carlos Mendoza',
    country: 'Spain 🇪🇸',
    streak: 21,
    minutes: 240,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
    color: '#D946EF',
  },
  {
    rank: 4,
    name: 'Yuki Tanaka',
    country: 'Japan 🇯🇵',
    streak: 19,
    minutes: 210,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&q=80',
    color: '#64748B',
  },
  {
    rank: 5,
    name: 'Chloe Dupont',
    country: 'France 🇫🇷',
    streak: 15,
    minutes: 195,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80',
    color: '#64748B',
  },
];

export default function LeaderboardModal({ visible, onClose, currentUser }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 24 }}>🏆</Text>
              <Text style={styles.modalTitle}>Speaking Leaderboard</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close leaderboard"
            >
              <Ionicons name="close" size={22} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Top 3 Podium Visual */}
          <View style={styles.podiumVisualBox}>
            {/* 2nd Place */}
            <View style={[styles.podiumColumn, { marginTop: 24 }]}>
              <View style={[styles.podiumAvatarCircle, { borderColor: '#38BDF8' }]}>
                <Image source={{ uri: TOP_LEARNERS[1].avatar }} style={styles.avatarImg} />
                <View style={[styles.rankBadge, { backgroundColor: '#38BDF8' }]}>
                  <Text style={styles.rankBadgeNum}>2</Text>
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>Prateek</Text>
              <View style={[styles.podiumPillar, { height: 60, backgroundColor: '#BAE6FD' }]}>
                <Text style={styles.podiumPoints}>275m</Text>
              </View>
            </View>

            {/* 1st Place */}
            <View style={styles.podiumColumn}>
              <Text style={{ fontSize: 20, marginBottom: -6 }}>👑</Text>
              <View style={[styles.podiumAvatarCircle, { borderColor: '#FFB800' }]}>
                <Image source={{ uri: TOP_LEARNERS[0].avatar }} style={styles.avatarImg} />
                <View style={[styles.rankBadge, { backgroundColor: '#FFB800' }]}>
                  <Text style={styles.rankBadgeNum}>1</Text>
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>Amina</Text>
              <View style={[styles.podiumPillar, { height: 85, backgroundColor: '#FDE68A' }]}>
                <Text style={styles.podiumPoints}>320m</Text>
              </View>
            </View>

            {/* 3rd Place */}
            <View style={[styles.podiumColumn, { marginTop: 36 }]}>
              <View style={[styles.podiumAvatarCircle, { borderColor: '#D946EF' }]}>
                <Image source={{ uri: TOP_LEARNERS[2].avatar }} style={styles.avatarImg} />
                <View style={[styles.rankBadge, { backgroundColor: '#D946EF' }]}>
                  <Text style={styles.rankBadgeNum}>3</Text>
                </View>
              </View>
              <Text style={styles.podiumName} numberOfLines={1}>Carlos</Text>
              <View style={[styles.podiumPillar, { height: 48, backgroundColor: '#F5D0FE' }]}>
                <Text style={styles.podiumPoints}>240m</Text>
              </View>
            </View>
          </View>

          {/* Leaderboard List */}
          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {TOP_LEARNERS.map((learner) => (
              <View key={learner.rank} style={styles.learnerRow}>
                <Text style={styles.rowRank}>#{learner.rank}</Text>
                <Image source={{ uri: learner.avatar }} style={styles.rowAvatar} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.rowName}>{learner.name}</Text>
                  <Text style={styles.rowCountry}>{learner.country}</Text>
                </View>
                <View style={styles.streakBadge}>
                  <Text style={{ fontSize: 12 }}>🔥</Text>
                  <Text style={styles.streakNum}>{learner.streak}</Text>
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
    maxHeight: '85%',
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
  podiumVisualBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  podiumColumn: {
    alignItems: 'center',
    width: 76,
  },
  podiumAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    position: 'relative',
    overflow: 'visible',
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  rankBadgeNum: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  podiumName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
    marginBottom: 4,
  },
  podiumPillar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  podiumPoints: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  learnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowRank: {
    width: 28,
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  rowName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowCountry: {
    fontSize: 11.5,
    color: '#64748B',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  streakNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
});
