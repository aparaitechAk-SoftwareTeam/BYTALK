import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

export default function CallTabScreen({
  partners = [],
  callHistory = [],
  onStartCall,
  onStartRandomMatch,
  isMatching = false,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'history'

  const formatDuration = (secs) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const onlinePartners = partners.filter((p) => p.online);
  const sortedPartners = [...partners].sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
  const displayPartners = filterType === 'online' ? onlinePartners : sortedPartners;

  return (
    <View style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Matchmaker Hero Card */}
        <LinearGradient
          colors={['#5843E8', '#7C5DF9', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.randomMatchCard}
        >
          <View style={styles.matchCardTop}>
            <View style={styles.matchIconCircle}>
              <Ionicons name="people" size={24} color="#5843E8" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.matchTitle}>Instant Speaking Match</Text>
              <Text style={styles.matchSubtitle}>
                Practice English live with native & fluent speakers
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onStartRandomMatch}
            disabled={isMatching}
            style={[styles.startMatchBtn, isMatching && { opacity: 0.8 }]}
            activeOpacity={0.88}
          >
            {isMatching ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#5843E8" size="small" />
                <Text style={styles.startMatchBtnText}>Matching Partner...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="call" size={17} color="#5843E8" />
                <Text style={styles.startMatchBtnText}>Start Random Call</Text>
              </View>
            )}
          </TouchableOpacity>
        </LinearGradient>

        {/* Section Tabs: All | Online | Recent Calls */}
        <View style={styles.sectionTabRow}>
          <TouchableOpacity
            onPress={() => setFilterType('all')}
            style={[styles.sectionTab, filterType === 'all' && styles.sectionTabActive]}
          >
            <Text style={[styles.sectionTabText, filterType === 'all' && styles.sectionTabTextActive]}>
              All ({partners.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType('online')}
            style={[styles.sectionTab, filterType === 'online' && styles.sectionTabActive]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
              <Text style={[styles.sectionTabText, filterType === 'online' && styles.sectionTabTextActive]}>
                Online ({onlinePartners.length})
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterType('history')}
            style={[styles.sectionTab, filterType === 'history' && styles.sectionTabActive]}
          >
            <Text style={[styles.sectionTabText, filterType === 'history' && styles.sectionTabTextActive]}>
              Recent Calls ({callHistory.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Online & Community Partners List */}
        {(filterType === 'all' || filterType === 'online') && (
          <View style={styles.partnersList}>
            {displayPartners.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name={filterType === 'online' ? 'radio-outline' : 'planet-outline'} size={42} color="#94A3B8" />
                <Text style={styles.emptyTitle}>
                  {filterType === 'online' ? 'No Partners Online Right Now' : 'Connecting to Community...'}
                </Text>
                <Text style={styles.emptySub}>
                  {filterType === 'online'
                    ? 'Check back soon, browse all community members, or tap Instant Speaking Match above!'
                    : 'Looking for active language learners. Use Instant Speaking Match above!'}
                </Text>
              </View>
            ) : (
              displayPartners.map((partner) => (
                <View key={partner.id} style={styles.partnerRowCard}>
                  <View style={styles.partnerAvatarBox}>
                    <Image
                      source={{ uri: partner.profilePhotoUrl || DEFAULT_AVATAR }}
                      style={styles.partnerAvatar}
                    />
                    <View style={[styles.onlineDot, !partner.online && { backgroundColor: '#94A3B8' }]} />
                  </View>

                  <View style={styles.partnerInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.partnerName}>
                        {partner.displayName || partner.name}
                      </Text>
                      {partner.online && (
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '700' }}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.partnerDetail}>
                      {partner.country || 'Global'} • {partner.learningLanguage || 'English'} ({partner.level || 'Beginner'})
                    </Text>
                  </View>

                  {/* Call Action Buttons (Audio & Video) */}
                  <View style={styles.callButtonsGroup}>
                    <TouchableOpacity
                      onPress={() => onStartCall(partner, 'audio')}
                      style={styles.audioCallBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Voice call ${partner.name}`}
                    >
                      <Ionicons name="call" size={16} color="#5843E8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => onStartCall(partner, 'video')}
                      style={styles.videoCallBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Video call ${partner.name}`}
                    >
                      <Ionicons name="videocam" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Call History List */}
        {filterType === 'history' && (
          <View style={styles.partnersList}>
            {callHistory.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="call-outline" size={42} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Recent Calls</Text>
                <Text style={styles.emptySub}>
                  Your completed voice and video calls will show up here.
                </Text>
              </View>
            ) : (
              callHistory.map((item, idx) => (
                <View key={item.id || idx} style={styles.partnerRowCard}>
                  <View style={styles.partnerAvatarBox}>
                    <Image
                      source={{ uri: item.partner?.profilePhotoUrl || DEFAULT_AVATAR }}
                      style={styles.partnerAvatar}
                    />
                  </View>

                  <View style={styles.partnerInfo}>
                    <Text style={styles.partnerName}>
                      {item.partner?.displayName || item.partner?.name || 'Conversation Partner'}
                    </Text>
                    <Text style={styles.partnerDetail}>
                      Duration: {formatDuration(item.durationSeconds || item.duration)} • {item.callType || 'Audio'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => onStartCall(item.partner, 'audio')}
                    style={styles.reDialBtn}
                  >
                    <Ionicons name="reload" size={15} color="#5843E8" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAF9FE',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  randomMatchCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#5843E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  matchCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  matchIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  matchSubtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    lineHeight: 16,
  },
  startMatchBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startMatchBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5843E8',
  },
  sectionTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sectionTabActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: '#5843E8',
  },
  sectionTabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionTabTextActive: {
    color: '#5843E8',
    fontWeight: '800',
  },
  partnersList: {
    gap: 10,
  },
  partnerRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECEBF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  partnerAvatarBox: {
    position: 'relative',
    marginRight: 12,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  partnerDetail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  callButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5843E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reDialBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
