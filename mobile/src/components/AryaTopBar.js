import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

export default function AryaTopBar({
  user,
  userStats,
  currentScreen = 'home',
  onPressBack,
  onPressProfile,
  onPressGetPro,
  onPressLeaderboard,
  onPressNotifications,
  isPro = false,
}) {
  const avatarUrl = user?.profilePhotoUrl || DEFAULT_AVATAR;
  const streak = userStats?.streak ?? user?.streak ?? 0;
  const showBackButton = Boolean(onPressBack && currentScreen !== 'home');

  return (
    <View style={styles.topBarContainer}>
      {showBackButton ? (
        <TouchableOpacity
          onPress={onPressBack}
          style={styles.backPillButton}
          activeOpacity={0.8}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          accessibilityRole="button"
          accessibilityLabel="Go back to Home"
        >
          <Ionicons name="chevron-back" size={24} color="#5843E8" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onPressProfile}
          style={styles.avatarWrapper}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open Profile"
        >
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          <View style={styles.avatarBadge}>
            <Ionicons name="menu" size={11} color="#5843E8" />
          </View>
        </TouchableOpacity>
      )}

      {/* Golden "Get Pro" / "PRO" Pill */}
      <TouchableOpacity
        onPress={onPressGetPro}
        style={[styles.proPill, isPro && styles.proPillActive]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Get Pro Subscription"
      >
        <Text style={styles.proCrownEmoji}>👑</Text>
        <Text style={[styles.proPillText, isPro && styles.proPillTextActive]}>
          {isPro ? 'PRO Active' : 'Get Pro'}
        </Text>
      </TouchableOpacity>

      {/* Right Action Icons: Notification Bell, Leaderboard, and Streak */}
      <View style={styles.rightGroup}>
        {/* Notification Ringing Bell */}
        <TouchableOpacity
          onPress={onPressNotifications}
          style={styles.iconPillButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={16} color="#5843E8" />
            <View style={styles.bellBadgeDot} />
          </View>
        </TouchableOpacity>

        {/* Podium Leaderboard Icon Button */}
        <TouchableOpacity
          onPress={onPressLeaderboard}
          style={styles.iconPillButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open Leaderboard"
        >
          <View style={styles.podiumContainer}>
            <View style={[styles.podiumStep, styles.podiumStep2]}>
              <Text style={styles.podiumNum}>2</Text>
            </View>
            <View style={[styles.podiumStep, styles.podiumStep1]}>
              <Text style={styles.podiumNum}>1</Text>
            </View>
            <View style={[styles.podiumStep, styles.podiumStep3]}>
              <Text style={styles.podiumNum}>3</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Streak Flame Pill */}
        <View style={styles.streakPill}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    backgroundColor: '#FAF9FE',
  },
  backPillButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#ECEBF5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5843E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    width: 46,
    height: 46,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#7C5DF9',
    backgroundColor: '#E8E4FD',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#7C5DF9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF0',
    borderWidth: 1.5,
    borderColor: '#F6CE65',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    shadowColor: '#E6A519',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  proPillActive: {
    backgroundColor: '#F3EEFF',
    borderColor: '#7C5DF9',
  },
  proCrownEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  proPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B87A04',
    letterSpacing: 0.2,
  },
  proPillTextActive: {
    color: '#5843E8',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconPillButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEBF5',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bellBadgeDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 16,
    gap: 1.5,
  },
  podiumStep: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  podiumStep1: {
    height: 16,
    backgroundColor: '#FFB800',
  },
  podiumStep2: {
    height: 12,
    backgroundColor: '#38BDF8',
  },
  podiumStep3: {
    height: 9,
    backgroundColor: '#D946EF',
  },
  podiumNum: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEBF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  streakEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1D2E',
  },
});
