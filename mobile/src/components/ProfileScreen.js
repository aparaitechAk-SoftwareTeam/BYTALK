import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

export default function ProfileScreen({
  user,
  onBack,
  onPressGetPro,
  onUpdateProfile,
  onLogout,
  aryaSettings,
  onUpdateAryaSettings,
  isPro = false,
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || user?.name || 'Prateek Pawar');
  const [editEmail, setEditEmail] = useState(user?.email || 'pratikumeshpawar@gmail.com');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [giftClaimed, setGiftClaimed] = useState(false);

  // ARYA Voice Settings
  const voice = aryaSettings?.voice || 'FEMALE';
  const voiceSpeed = aryaSettings?.speed || '1x';
  const nativeLang = aryaSettings?.nativeLanguage || user?.nativeLanguage || 'Other (English)';

  const toggleVoice = () => {
    const nextVoice = voice === 'FEMALE' ? 'MALE' : 'FEMALE';
    if (onUpdateAryaSettings) {
      onUpdateAryaSettings({ ...aryaSettings, voice: nextVoice });
    }
  };

  const cycleVoiceSpeed = () => {
    const speeds = ['0.75x', '1x', '1.25x'];
    const idx = speeds.indexOf(voiceSpeed);
    const nextSpeed = speeds[(idx + 1) % speeds.length];
    if (onUpdateAryaSettings) {
      onUpdateAryaSettings({ ...aryaSettings, speed: nextSpeed });
    }
  };

  const handleClaimGift = () => {
    if (giftClaimed) {
      Alert.alert('Gift Already Claimed', 'You already claimed your welcome bonus!');
      return;
    }
    setGiftClaimed(true);
    Alert.alert('🎁 Gift Claimed!', 'You have unlocked 100 free AI conversation stars and 20 practice minutes!');
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }
    if (onUpdateProfile) {
      onUpdateProfile({ name: editName.trim(), email: editEmail.trim() });
    }
    setShowEditModal(false);
  };

  return (
    <View style={styles.screenContainer}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => {
            if (onBack) onBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color="#1A1D2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Card (Image 3) */}
        <View style={styles.userCard}>
          {/* Avatar and Badge */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircleBorder}>
              <Image
                source={{ uri: user?.profilePhotoUrl || DEFAULT_AVATAR }}
                style={styles.avatarImg}
              />
            </View>
            <View style={[styles.memberBadge, isPro && styles.memberBadgePro]}>
              <Text style={[styles.memberBadgeText, isPro && styles.memberBadgeTextPro]}>
                {isPro ? 'PRO Member 👑' : 'Free Memb...'}
              </Text>
            </View>
          </View>

          {/* User Details */}
          <View style={styles.userDetailsCol}>
            <View style={styles.userNameRow}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {user?.displayName || user?.name || 'Prateek Pawar'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(true)}
                style={styles.editPenCircle}
                accessibilityRole="button"
                accessibilityLabel="Edit profile details"
              >
                <Ionicons name="pencil" size={13} color="#92400E" />
              </TouchableOpacity>
            </View>

            <Text style={styles.userEmailText} numberOfLines={1}>
              {user?.email || 'pratikumeshpawar@gmail.com'}
            </Text>

            <Text style={styles.memberSinceText}>
              Member since Jan, 2025
            </Text>
          </View>
        </View>

        {/* Pro Banner Card (Image 3) */}
        <View style={styles.proBannerCard}>
          <Text style={styles.proBannerTitle}>BYTALK Pro</Text>
          <TouchableOpacity
            onPress={onPressGetPro}
            style={styles.noAutopayBtn}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.noAutopayGradient}
            >
              <Text style={styles.noAutopayText}>No Autopay Plans</Text>
              <Ionicons name="chevron-forward" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ARYA Settings Header */}
        <Text style={styles.sectionHeader}>ARYA Settings</Text>

        {/* ARYA Settings White Box (Image 3) */}
        <View style={styles.settingsBox}>
          {/* Row 1: ARYA Voice */}
          <TouchableOpacity
            onPress={toggleVoice}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="volume-medium-outline" size={22} color="#6C5CE7" />
              <Text style={styles.settingLabel}>ARYA Voice</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{voice}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          {/* Row 2: ARYA Voice Speed */}
          <TouchableOpacity
            onPress={cycleVoiceSpeed}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="speedometer-outline" size={22} color="#6C5CE7" />
              <Text style={styles.settingLabel}>ARYA Voice Speed</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{voiceSpeed}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          {/* Row 3: Native Language */}
          <TouchableOpacity
            onPress={() => setShowLanguageModal(true)}
            style={styles.settingRow}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={22} color="#6C5CE7" />
              <Text style={styles.settingLabel}>Native Language</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue} numberOfLines={1}>{nativeLang}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Discover Lovish Promo Card (Image 3) */}
        <LinearGradient
          colors={['#FFE4F0', '#F3E8FF', '#EDE9FE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.lovishPromoCard}
        >
          <View style={styles.lovishRow}>
            <View style={styles.lovishTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.lovishHeart}>💖</Text>
                <Text style={styles.lovishTitle}>Discover Lovish</Text>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>
              <Text style={styles.lovishSubtitle}>
                Your AI friend for meaningful conversations
              </Text>
            </View>

            {/* Gift Box Graphic */}
            <View style={styles.giftBoxIcon}>
              <Text style={{ fontSize: 38 }}>🎁</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleClaimGift}
            style={[styles.claimGiftBtn, giftClaimed && { opacity: 0.6 }]}
            activeOpacity={0.88}
          >
            <Text style={styles.claimGiftBtnText}>
              {giftClaimed ? 'Gift Claimed ✓' : 'Claim Your Gift'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Log Out Button */}
        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            style={styles.logoutButton}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.modalInput}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Your email"
              keyboardType="email-address"
            />

            <TouchableOpacity onPress={handleSaveProfile} style={styles.saveProfileBtn}>
              <Text style={styles.saveProfileBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Picker Modal */}
      <Modal visible={showLanguageModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Native Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {['English', 'Hindi', 'Marathi', 'Spanish', 'French', 'Other (English)'].map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => {
                  if (onUpdateAryaSettings) {
                    onUpdateAryaSettings({ ...aryaSettings, nativeLanguage: lang });
                  }
                  setShowLanguageModal(false);
                }}
                style={styles.langItem}
              >
                <Text style={styles.langItemText}>{lang}</Text>
                {nativeLang === lang && <Ionicons name="checkmark" size={18} color="#5843E8" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAF9FE',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    backgroundColor: '#FAF9FE',
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    zIndex: 999,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1D2E',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEBF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 14,
  },
  avatarSection: {
    alignItems: 'center',
    marginRight: 14,
  },
  avatarCircleBorder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    borderColor: '#7C5DF9',
    backgroundColor: '#E8E4FD',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  memberBadge: {
    backgroundColor: '#EEECFE',
    borderWidth: 1,
    borderColor: '#7C5DF9',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: -8,
  },
  memberBadgePro: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  memberBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#5843E8',
  },
  memberBadgeTextPro: {
    color: '#B45309',
  },
  userDetailsCol: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userNameText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1D2E',
    flex: 1,
  },
  editPenCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userEmailText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  memberSinceText: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 6,
  },
  proBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ECEBF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 20,
  },
  proBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1D2E',
  },
  noAutopayBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  noAutopayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  noAutopayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1D2E',
    marginBottom: 10,
  },
  settingsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEBF5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1A1D2E',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1A1D2E',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  lovishPromoCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  lovishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  lovishTextCol: {
    flex: 1,
  },
  lovishHeart: {
    fontSize: 15,
  },
  lovishTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B21A8',
  },
  newBadge: {
    backgroundColor: '#581C87',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lovishSubtitle: {
    fontSize: 12,
    color: '#7E22CE',
    marginTop: 4,
    lineHeight: 16,
  },
  giftBoxIcon: {
    marginLeft: 8,
  },
  claimGiftBtn: {
    backgroundColor: '#6B21A8',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimGiftBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingVertical: 12,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1D2E',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 14,
  },
  saveProfileBtn: {
    backgroundColor: '#5843E8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveProfileBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  langItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
});
