import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const GENERAL_TOPICS = [
  {
    id: 'talk_anything',
    title: 'Talk about anything',
    level: 'Easy',
    bars: 1,
    category: 'General',
    icon: 'chatbubbles',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    starterPrompt: "Let's have an open and friendly conversation about anything on your mind!",
    graphic: 'people_chatting',
  },
  {
    id: 'daily_routine',
    title: 'Daily routine',
    level: 'Easy',
    bars: 1,
    category: 'General',
    icon: 'sunny',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    starterPrompt: "Tell me about your daily routine. What does a typical day look like for you?",
    graphic: 'person_walking',
  },
  {
    id: 'improve_vocabulary',
    title: "Let's Improve vocabulary",
    level: 'Easy',
    bars: 1,
    category: 'General',
    icon: 'school',
    color: '#10B981',
    bgColor: '#ECFDF5',
    starterPrompt: "Let's learn and practice new vocabulary words today! What words would you like to explore?",
    graphic: 'classroom_board',
  },
  {
    id: 'childhood_memory',
    title: 'Talk about your childhood memory',
    level: 'Easy',
    bars: 1,
    category: 'General',
    icon: 'balloon',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    starterPrompt: "What is one of your favorite memories from growing up as a child?",
    graphic: 'child_balloon',
  },
  {
    id: 'travel_destinations',
    title: 'Travel & Dream destinations',
    level: 'Easy',
    bars: 1,
    category: 'General',
    icon: 'airplane',
    color: '#06B6D4',
    bgColor: '#ECFEFF',
    starterPrompt: "Where in the world would you love to travel to next, and why?",
    graphic: 'travel_world',
  },
  {
    id: 'movies_music',
    title: 'Movies & Favorite music',
    level: 'Easy',
    bars: 1,
    category: 'General',
    icon: 'musical-notes',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    starterPrompt: "What kind of movies or music do you enjoy listening to when you relax?",
    graphic: 'headphones_music',
  },
];

export const INTERVIEW_TOPICS = [
  {
    id: 'self_introduction',
    title: 'Tell me about yourself',
    level: 'Easy',
    bars: 1,
    category: 'Interview',
    icon: 'person',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    starterPrompt: "Welcome to your interview practice! Please introduce yourself and your background.",
    graphic: 'interview_handshake',
  },
  {
    id: 'job_interview',
    title: 'Job interview practice',
    level: 'Medium',
    bars: 2,
    category: 'Interview',
    icon: 'briefcase',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    starterPrompt: "Why are you interested in this position, and what strengths make you a great fit?",
    graphic: 'job_interview',
  },
  {
    id: 'strengths_weaknesses',
    title: 'Strengths & Weaknesses',
    level: 'Medium',
    bars: 2,
    category: 'Interview',
    icon: 'ribbon',
    color: '#10B981',
    bgColor: '#ECFDF5',
    starterPrompt: "What do you consider your greatest strength, and what is an area you are actively improving?",
    graphic: 'strengths_weaknesses',
  },
  {
    id: 'career_aspirations',
    title: 'Future career goals',
    level: 'Medium',
    bars: 2,
    category: 'Interview',
    icon: 'rocket',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    starterPrompt: "Where do you see your career heading in the next 3 to 5 years?",
    graphic: 'career_aspirations',
  },
];

// Rich, multi-layered professional illustrations matching reference Image 1
function CardIllustration({ type, color }) {
  switch (type) {
    case 'people_chatting':
      return (
        <View style={styles.illustrationBox}>
          {/* Ambient soft glow ring */}
          <View style={styles.chatGlowBackdrop} />

          <View style={styles.chattingScene}>
            {/* Person Left (Purple shirt) */}
            <View style={styles.chatFigureCol}>
              <View style={[styles.avatarHead, { backgroundColor: '#7C3AED' }]} />
              <View style={[styles.avatarBody, { backgroundColor: '#8B5CF6' }]} />
            </View>

            {/* Center Table & Floating Speech Bubble */}
            <View style={styles.tableCenterCol}>
              {/* Animated Floating Speech Bubble */}
              <View style={styles.chatBubblePill}>
                <View style={styles.chatDot1} />
                <View style={styles.chatDot2} />
                <View style={styles.chatDot3} />
              </View>

              {/* Table Top Surface with Coffee Mugs */}
              <View style={styles.tableMugRow}>
                <View style={[styles.miniCoffeeMug, { backgroundColor: '#A78BFA' }]} />
                <View style={[styles.miniCoffeeMug, { backgroundColor: '#60A5FA' }]} />
              </View>
              <View style={styles.tableTopSurface} />
              <View style={styles.tablePedestal} />
              <View style={styles.tableBaseFoot} />
            </View>

            {/* Person Right (Blue shirt) */}
            <View style={styles.chatFigureCol}>
              <View style={[styles.avatarHead, { backgroundColor: '#2563EB' }]} />
              <View style={[styles.avatarBody, { backgroundColor: '#3B82F6' }]} />
            </View>
          </View>
        </View>
      );

    case 'person_walking':
      return (
        <View style={styles.illustrationBox}>
          {/* Golden Morning Sun */}
          <View style={styles.morningSunDisc} />

          {/* City Skyline Backdrop */}
          <View style={styles.walkingBackdrop}>
            <View style={[styles.cityBuilding, { height: 26, width: 14 }]} />
            <View style={[styles.cityBuilding, { height: 42, width: 18 }]} />
            <View style={[styles.cityBuilding, { height: 22, width: 12 }]} />
            <View style={[styles.cityBuilding, { height: 35, width: 16 }]} />
          </View>

          {/* Green Foliage Bushes */}
          <View style={styles.greeneryRow}>
            <View style={[styles.greenBush, { width: 14, height: 10, left: 14 }]} />
            <View style={[styles.greenBush, { width: 16, height: 12, right: 14 }]} />
          </View>

          {/* Walking Figure in Electric Blue */}
          <View style={styles.walkingFigureCenter}>
            <Ionicons name="walk" size={34} color="#1D4ED8" />
          </View>
        </View>
      );

    case 'classroom_board':
      return (
        <View style={styles.illustrationBox}>
          {/* Classroom Blackboard Frame */}
          <View style={styles.blackboardFrame}>
            <View style={styles.boardChalkHeader}>
              <Text style={styles.boardAbcText}>A B C</Text>
              <Ionicons name="bulb" size={13} color="#FBBF24" />
            </View>
            <View style={styles.boardChalkDivider} />
            <View style={styles.boardLowerRow}>
              <Ionicons name="school" size={16} color="#34D399" />
              <View style={styles.chalkMiniLine} />
            </View>
          </View>

          {/* Stand Legs */}
          <View style={styles.boardEaselStand}>
            <View style={styles.easelLegLeft} />
            <View style={styles.easelLegRight} />
          </View>
        </View>
      );

    case 'child_balloon':
      return (
        <View style={styles.illustrationBox}>
          {/* Sparkle star in background */}
          <View style={styles.childBackdropSparkle}>
            <Ionicons name="sparkles" size={12} color="#F59E0B" />
          </View>

          <View style={styles.childScene}>
            {/* Smiling Child Avatar */}
            <View style={styles.childAvatarWrap}>
              <Ionicons name="happy" size={32} color="#D97706" />
              <View style={styles.childShirt} />
            </View>

            {/* Glossy Red Balloon on curved string */}
            <View style={styles.balloonCol}>
              <View style={styles.balloonBody}>
                <View style={styles.balloonGloss} />
              </View>
              <View style={styles.balloonKnot} />
              <View style={styles.balloonStringCurve} />
            </View>
          </View>
        </View>
      );

    case 'travel_world':
      return (
        <View style={styles.illustrationBox}>
          <View style={styles.badgeCenterWrap}>
            {/* Globe */}
            <Ionicons name="earth" size={38} color="#0891B2" />

            {/* Orbiting Plane */}
            <View style={styles.airplaneBadgeCorner}>
              <Ionicons name="airplane" size={20} color="#2563EB" />
            </View>

            {/* Dotted Flight Trail */}
            <View style={styles.flightTrailArc} />
          </View>
        </View>
      );

    case 'headphones_music':
      return (
        <View style={styles.illustrationBox}>
          {/* Soundwave equalizer bars */}
          <View style={styles.soundwavesBackdrop}>
            <View style={[styles.soundwaveBar, { height: 12, backgroundColor: '#F472B6' }]} />
            <View style={[styles.soundwaveBar, { height: 22, backgroundColor: '#C084FC' }]} />
            <View style={[styles.soundwaveBar, { height: 16, backgroundColor: '#60A5FA' }]} />
            <View style={[styles.soundwaveBar, { height: 24, backgroundColor: '#F472B6' }]} />
            <View style={[styles.soundwaveBar, { height: 14, backgroundColor: '#C084FC' }]} />
          </View>

          <View style={styles.badgeCenterWrap}>
            {/* Studio Headphones */}
            <Ionicons name="headset" size={38} color="#DB2777" />

            {/* Dancing Musical Notes */}
            <View style={styles.musicBadgeCorner}>
              <Ionicons name="musical-notes" size={19} color="#9333EA" />
            </View>
          </View>
        </View>
      );

    case 'interview_handshake':
      return (
        <View style={styles.illustrationBox}>
          <View style={styles.badgeCenterWrap}>
            {/* Professional handshake figures */}
            <Ionicons name="people" size={34} color="#4F46E5" />

            {/* Verified checkmark badge */}
            <View style={styles.checkBadgeCorner}>
              <Ionicons name="checkmark-circle" size={17} color="#10B981" />
            </View>
          </View>
        </View>
      );

    case 'job_interview':
      return (
        <View style={styles.illustrationBox}>
          <View style={styles.badgeCenterWrap}>
            {/* Executive Briefcase */}
            <Ionicons name="briefcase" size={34} color="#2563EB" />

            {/* Ascending Career Trend Arrow */}
            <View style={styles.trendBadgeCorner}>
              <Ionicons name="trending-up" size={18} color="#059669" />
            </View>
          </View>
        </View>
      );

    case 'strengths_weaknesses':
      return (
        <View style={styles.illustrationBox}>
          <View style={styles.badgeCenterWrap}>
            {/* First Place Ribbon */}
            <Ionicons name="ribbon" size={36} color="#059669" />

            {/* Gleaming Star Medal */}
            <View style={styles.starBadgeCorner}>
              <Ionicons name="star" size={15} color="#D97706" />
            </View>
          </View>
        </View>
      );

    case 'career_aspirations':
      return (
        <View style={styles.illustrationBox}>
          <View style={styles.badgeCenterWrap}>
            {/* Space Rocket Launching */}
            <Ionicons name="rocket" size={36} color="#EA580C" />

            {/* Star Sparkles */}
            <View style={styles.sparkleBadgeCorner}>
              <Ionicons name="sparkles" size={16} color="#EAB308" />
            </View>
          </View>
        </View>
      );

    default:
      return (
        <View style={styles.illustrationBox}>
          <Ionicons name="chatbubbles" size={34} color={color || '#8B5CF6'} />
        </View>
      );
  }
}

export default function AryaHomeScreen({
  user,
  onSelectTopic,
  onPressGetPro,
  onPressHistory,
  isPro = false,
}) {
  const [activeCategory, setActiveCategory] = useState('General'); // 'General' | 'Interview'

  // Live countdown timer state (hours, minutes, seconds)
  const [timeLeft, setTimeLeft] = useState({ hours: 13, minutes: 15, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const format2 = (n) => String(n).padStart(2, '0');
  const topics = activeCategory === 'General' ? GENERAL_TOPICS : INTERVIEW_TOPICS;

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ARYA AI Hero Header */}
        <View style={styles.aryaHeaderRow}>
          <View style={styles.aryaTitleGroup}>
            {/* 3D Robot Avatar with Cyan Face & Headset */}
            <View style={styles.robotAvatarContainer}>
              <LinearGradient
                colors={['#38BDF8', '#0284C7']}
                style={styles.robotGradientCircle}
              >
                <View style={styles.robotFaceOuter}>
                  <Ionicons name="headset" size={17} color="#FFFFFF" style={styles.robotHeadset} />
                  <View style={styles.robotFaceScreen}>
                    <View style={styles.robotEye} />
                    <View style={styles.robotEye} />
                  </View>
                  <View style={styles.robotSmileLine} />
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.aryaTitleText}>ARYA AI</Text>
          </View>

          {/* History Link Button */}
          <TouchableOpacity
            onPress={onPressHistory}
            style={styles.historyButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View Practice History"
          >
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher: General | Interview */}
        <View style={styles.tabSwitcherContainer}>
          <TouchableOpacity
            onPress={() => setActiveCategory('General')}
            style={[styles.switcherTab, activeCategory === 'General' && styles.switcherTabActive]}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeCategory === 'General' }}
          >
            <Text style={[styles.switcherTabText, activeCategory === 'General' && styles.switcherTabTextActive]}>
              General
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveCategory('Interview')}
            style={[styles.switcherTab, activeCategory === 'Interview' && styles.switcherTabActive]}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeCategory === 'Interview' }}
          >
            <Text style={[styles.switcherTabText, activeCategory === 'Interview' && styles.switcherTabTextActive]}>
              Interview
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2-Column Cards Grid with Floating Crown Badges */}
        <View style={styles.cardsGrid}>
          {topics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              onPress={() => onSelectTopic(topic)}
              style={styles.cardItem}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Practice ${topic.title}`}
            >
              {/* Crown Badge floating on top center border */}
              <View style={styles.crownBadgeFloating}>
                <Text style={styles.crownBadgeEmoji}>👑</Text>
              </View>

              {/* Top Row: Signal Level Bars + Text */}
              <View style={styles.cardTopRow}>
                <View style={styles.levelSignalContainer}>
                  <View style={styles.signalBarGroup}>
                    <View style={[styles.signalBar, topic.bars >= 1 && styles.signalBarFilled]} />
                    <View style={[styles.signalBar, topic.bars >= 2 && styles.signalBarFilled]} />
                    <View style={[styles.signalBar, topic.bars >= 3 && styles.signalBarFilled]} />
                  </View>
                  <Text style={styles.levelText}>{topic.level}</Text>
                </View>
              </View>

              {/* Graphic Illustration with soft pastel background pill */}
              <View style={[styles.graphicArea, { backgroundColor: topic.bgColor || '#F8FAFC' }]}>
                <CardIllustration type={topic.graphic} color={topic.color} />
              </View>

              {/* Card Title Box: Fixed height for uniform alignment */}
              <View style={styles.cardTitleBox}>
                <Text style={styles.cardTitleText} numberOfLines={2}>
                  {topic.title}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom padding to leave room for the floating banner */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating Bottom Festive Offer Banner */}
      <View style={styles.floatingBannerWrapper}>
        <TouchableOpacity
          onPress={onPressGetPro}
          activeOpacity={0.92}
          style={styles.bannerTouchArea}
          accessibilityRole="button"
          accessibilityLabel="Open Festive Limited Time Sale"
        >
          <LinearGradient
            colors={isPro ? ['#064E3B', '#047857', '#059669'] : ['#070B34', '#151C60', '#251B5A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.festiveBannerGradient}
          >
            {isPro ? (
              <View style={styles.proBannerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 22 }}>👑</Text>
                  <View>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FDE047' }}>PRO ACTIVE MEMBER</Text>
                    <Text style={{ fontSize: 11, color: '#E2E8F0', marginTop: 1 }}>Unlimited AI & HD Video Practice Active</Text>
                  </View>
                </View>
                <View style={[styles.bannerArrowCircle, { backgroundColor: '#FDE047' }]}>
                  <Ionicons name="sparkles" size={13} color="#0D1038" />
                </View>
              </View>
            ) : (
              <>
                {/* Left: Text & Arrow Icon */}
                <View style={styles.bannerLeftSection}>
                  <Text style={styles.bannerMainTitle} numberOfLines={1}>
                    Festive Limited T...
                  </Text>
                  <View style={styles.bannerArrowCircle}>
                    <Ionicons name="arrow-forward" size={13} color="#0D1038" />
                  </View>
                </View>

                {/* Right: "Offer ends in" + Countdown Clock */}
                <View style={styles.bannerRightSection}>
                  {/* Red Tag */}
                  <View style={styles.offerEndsTag}>
                    <Text style={styles.offerEndsTagText}>Offer ends in</Text>
                  </View>

                  {/* Countdown Digits Box */}
                  <View style={styles.countdownBox}>
                    <View style={styles.timeDigitCol}>
                      <Text style={styles.timeDigit}>{format2(timeLeft.hours)}</Text>
                      <Text style={styles.timeLabel}>Hrs</Text>
                    </View>
                    <Text style={styles.timeColon}>:</Text>
                    <View style={styles.timeDigitCol}>
                      <Text style={styles.timeDigit}>{format2(timeLeft.minutes)}</Text>
                      <Text style={styles.timeLabel}>Mins</Text>
                    </View>
                    <Text style={styles.timeColon}>:</Text>
                    <View style={styles.timeDigitCol}>
                      <Text style={styles.timeDigit}>{format2(timeLeft.seconds)}</Text>
                      <Text style={styles.timeLabel}>Secs</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    paddingTop: 10,
  },
  aryaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  aryaTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  robotAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  robotGradientCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotFaceOuter: {
    width: 26,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  robotHeadset: {
    position: 'absolute',
    top: -5,
  },
  robotFaceScreen: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotEye: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  robotSmileLine: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#38BDF8',
    marginTop: 2,
  },
  aryaTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1D2E',
    letterSpacing: 0.6,
  },
  historyButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  historyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F0FB',
    borderRadius: 14,
    padding: 4,
    marginTop: 6,
    marginBottom: 20,
  },
  switcherTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  switcherTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#5843E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  switcherTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#718096',
  },
  switcherTabTextActive: {
    fontWeight: '800',
    color: '#5843E8',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 22,
    paddingTop: 10,
  },
  cardItem: {
    width: '48%',
    height: 198,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 10,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEBF5',
    shadowColor: '#5843E8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    justifyContent: 'space-between',
  },
  crownBadgeFloating: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFDF0',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  crownBadgeEmoji: {
    fontSize: 13,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  levelSignalContainer: {
    alignItems: 'flex-start',
    gap: 2,
  },
  signalBarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  signalBar: {
    width: 9,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  signalBarFilled: {
    backgroundColor: '#38BDF8',
  },
  levelText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  graphicArea: {
    height: 82,
    width: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginVertical: 4,
  },
  illustrationBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chatGlowBackdrop: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  chattingScene: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
  },
  chatFigureCol: {
    alignItems: 'center',
  },
  avatarHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 2,
  },
  avatarBody: {
    width: 18,
    height: 16,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableCenterCol: {
    alignItems: 'center',
    marginBottom: 1,
  },
  chatBubblePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 3,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  chatDot1: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  chatDot2: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  chatDot3: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  tableMugRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 1,
  },
  miniCoffeeMug: {
    width: 5,
    height: 6,
    borderRadius: 1.5,
  },
  tableTopSurface: {
    width: 34,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
  },
  tablePedestal: {
    width: 3.5,
    height: 8,
    backgroundColor: '#94A3B8',
  },
  tableBaseFoot: {
    width: 14,
    height: 2,
    backgroundColor: '#64748B',
    borderRadius: 1,
  },
  morningSunDisc: {
    position: 'absolute',
    top: 6,
    right: 18,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FDE047',
    opacity: 0.8,
  },
  walkingBackdrop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 6,
    opacity: 0.35,
    gap: 3,
  },
  cityBuilding: {
    backgroundColor: '#64748B',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  greeneryRow: {
    position: 'absolute',
    bottom: 6,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  greenBush: {
    backgroundColor: '#10B981',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    opacity: 0.6,
  },
  walkingFigureCenter: {
    alignItems: 'center',
    zIndex: 2,
  },
  blackboardFrame: {
    width: 56,
    height: 38,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#059669',
    backgroundColor: '#064E3B',
    padding: 3,
    justifyContent: 'space-between',
    shadowColor: '#059669',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  boardChalkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boardAbcText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 1,
  },
  boardChalkDivider: {
    height: 1.5,
    width: '90%',
    backgroundColor: '#34D399',
    borderRadius: 1,
    alignSelf: 'center',
  },
  boardLowerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  chalkMiniLine: {
    width: 18,
    height: 2,
    backgroundColor: '#6EE7B7',
    borderRadius: 1,
  },
  boardEaselStand: {
    width: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  easelLegLeft: {
    width: 2.5,
    height: 6,
    backgroundColor: '#94A3B8',
    transform: [{ rotate: '15deg' }],
  },
  easelLegRight: {
    width: 2.5,
    height: 6,
    backgroundColor: '#94A3B8',
    transform: [{ rotate: '-15deg' }],
  },
  childBackdropSparkle: {
    position: 'absolute',
    top: 6,
    left: 18,
    opacity: 0.7,
  },
  childScene: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarWrap: {
    alignItems: 'center',
  },
  childShirt: {
    width: 16,
    height: 8,
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginTop: -2,
  },
  balloonCol: {
    marginLeft: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  balloonBody: {
    width: 22,
    height: 26,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    position: 'relative',
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  balloonGloss: {
    position: 'absolute',
    top: 3,
    left: 4,
    width: 5,
    height: 8,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  balloonKnot: {
    width: 3,
    height: 2,
    backgroundColor: '#DC2626',
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
  balloonStringCurve: {
    width: 1,
    height: 10,
    backgroundColor: '#B91C1C',
  },
  badgeCenterWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flightTrailArc: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  airplaneBadgeCorner: {
    position: 'absolute',
    top: -8,
    right: -12,
    transform: [{ rotate: '42deg' }],
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  soundwavesBackdrop: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    opacity: 0.45,
  },
  soundwaveBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
  musicBadgeCorner: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  checkBadgeCorner: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  trendBadgeCorner: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  starBadgeCorner: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    padding: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sparkleBadgeCorner: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitleBox: {
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  cardTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D2E',
    textAlign: 'center',
    lineHeight: 18,
  },
  floatingBannerWrapper: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
  },
  bannerTouchArea: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#070B34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  festiveBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  proBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  bannerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 6,
  },
  bannerMainTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  bannerArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRightSection: {
    alignItems: 'center',
    position: 'relative',
  },
  offerEndsTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    position: 'absolute',
    top: -8,
    zIndex: 10,
  },
  offerEndsTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAB308',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 3,
  },
  timeDigitCol: {
    alignItems: 'center',
    minWidth: 18,
  },
  timeDigit: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  timeLabel: {
    fontSize: 7.5,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: -2,
  },
  timeColon: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
});
