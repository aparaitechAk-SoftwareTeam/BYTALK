import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { speakEnglish, stopSpeech } from '../utils/speechHelper';

const { width: windowWidth } = Dimensions.get('window');

const LESSON_PHRASES = [
  {
    phrase: "Hey, what's up?",
    meaning: 'Casual friendly greeting used with friends and peers',
    example: "Hey, what's up? Long time no see!",
  },
  {
    phrase: 'How is it going?',
    meaning: 'Inquiring how someone is doing in an informal way',
    example: 'Hey Sarah! How is it going with your new project?',
  },
  {
    phrase: 'Great to meet you!',
    meaning: 'Warm greeting when introduced to someone new',
    example: 'Great to meet you, David. Welcome to our language exchange group!',
  },
  {
    phrase: 'Catch you later!',
    meaning: 'Casual goodbye phrase for everyday talk',
    example: 'I have to run now. Catch you later!',
  },
];

export default function LearnScreen({
  user,
  userStats,
  onPressHistory,
  onAddStars,
}) {
  const [showTooltip, setShowTooltip] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  // Daily study timer countdown (starts at 20:00)
  const [secondsRemaining, setSecondsRemaining] = useState(20 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartLesson = () => {
    setShowLessonModal(true);
    setActivePhraseIndex(0);
    setLessonCompleted(false);
  };

  const handlePlayAudio = (phrase, idx) => {
    setSpeakingIndex(idx);
    speakEnglish(
      phrase,
      () => setSpeakingIndex(idx),
      () => setSpeakingIndex(null)
    );
  };

  const handleNextPhrase = () => {
    stopSpeech();
    if (activePhraseIndex < LESSON_PHRASES.length - 1) {
      setActivePhraseIndex((prev) => prev + 1);
    } else {
      setLessonCompleted(true);
      if (onAddStars) onAddStars(20);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Sub Header (Image 4): Learning Pathway (?) | ⏱️ 20:00 | History */}
      <View style={styles.subHeader}>
        <View style={styles.pathwayTitleGroup}>
          <Text style={styles.pathwayTitleText}>Learning P...</Text>
          <TouchableOpacity
            onPress={() => Alert.alert('Learning Pathway', 'Follow the units and milestones to master everyday spoken English step-by-step!')}
            style={styles.helpCircle}
          >
            <Ionicons name="help-circle-outline" size={17} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Timer Pill: ⏱️ 20:00 */}
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={14} color="#D97706" style={{ marginRight: 4 }} />
          <Text style={styles.timerPillText}>{formatTimer(secondsRemaining)}</Text>
        </View>

        {/* History Link */}
        <TouchableOpacity
          onPress={onPressHistory}
          style={styles.historyBtn}
          accessibilityRole="button"
          accessibilityLabel="Open Practice History"
        >
          <Text style={styles.historyBtnText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Sky Blue Cloud Background & Scrollable Pathway (Image 4) */}
      <LinearGradient
        colors={['#BFDBFE', '#DBEAFE', '#EFF6FF', '#F8FAFC']}
        style={styles.skyGradient}
      >
        <ScrollView contentContainerStyle={styles.pathwayScroll} showsVerticalScrollIndicator={false}>
          {/* Unit 1 Header Frosted Card (Image 4) */}
          <View style={styles.unitHeaderCard}>
            <Text style={styles.unitBadgeText}>Unit 1</Text>
            <Text style={styles.unitTitleText}>Meet and Greet</Text>
          </View>

          {/* Dotted Pathway Curve Visual */}
          <View style={styles.pathwayCanvas}>
            {/* Curved dashed line representation */}
            <View style={styles.dashedCurveGuide} />

            {/* Chapter 1 Hexagon Milestone */}
            <View style={styles.milestoneNode}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedChapter(1);
                  setShowTooltip(true);
                }}
                activeOpacity={0.85}
                style={styles.hexagonShape}
              >
                <Text style={styles.hexagonNum}>1</Text>
                <Text style={styles.hexagonLabel}>Chapter</Text>
              </TouchableOpacity>
              <Text style={styles.chapterSubtitle}>Informal greetings</Text>
            </View>

            {/* Interactive Tooltip Card Pointing to Chapter 1 (Image 4) */}
            {showTooltip && (
              <View style={styles.tooltipCalloutBox}>
                <View style={styles.tooltipArrowUp} />
                <View style={styles.tooltipCard}>
                  {/* Close X */}
                  <TouchableOpacity
                    onPress={() => setShowTooltip(false)}
                    style={styles.tooltipCloseBtn}
                  >
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>

                  <Text style={styles.tooltipTitle}>
                    Informal Opening Greeting words and Phrases
                  </Text>
                  <Text style={styles.tooltipSubtitle}>
                    Start your first lesson
                  </Text>

                  {/* START +20 STARS Button (Image 4) */}
                  <TouchableOpacity
                    onPress={handleStartLesson}
                    style={styles.startStarsBtn}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.startStarsBtnText}>START +20 STARS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Chapter 2 Hexagon Milestone */}
            <View style={[styles.milestoneNode, { alignSelf: 'flex-end', marginRight: 36, marginTop: 30 }]}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedChapter(2);
                  setShowTooltip(true);
                }}
                activeOpacity={0.85}
                style={[styles.hexagonShape, styles.hexagonShapeLocked]}
              >
                <Text style={styles.hexagonNum}>2</Text>
                <Text style={styles.hexagonLabel}>Chapter</Text>
              </TouchableOpacity>
              <Text style={styles.chapterSubtitle}>Greetings and salutations</Text>
            </View>

            {/* Chapter 3 Hexagon Milestone */}
            <View style={[styles.milestoneNode, { alignSelf: 'flex-start', marginLeft: 44, marginTop: 40 }]}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedChapter(3);
                  setShowTooltip(true);
                }}
                activeOpacity={0.85}
                style={[styles.hexagonShape, styles.hexagonShapeLocked]}
              >
                <Text style={styles.hexagonNum}>3</Text>
                <Text style={styles.hexagonLabel}>Chapter</Text>
              </TouchableOpacity>
              <Text style={styles.chapterSubtitle}>Small talk & introductions</Text>
            </View>

            {/* Chapter 4 Hexagon Milestone */}
            <View style={[styles.milestoneNode, { alignSelf: 'center', marginTop: 40 }]}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedChapter(4);
                  setShowTooltip(true);
                }}
                activeOpacity={0.85}
                style={[styles.hexagonShape, styles.hexagonShapeLocked]}
              >
                <Text style={styles.hexagonNum}>4</Text>
                <Text style={styles.hexagonLabel}>Chapter</Text>
              </TouchableOpacity>
              <Text style={styles.chapterSubtitle}>Making friends & polite phrases</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>

      {/* Interactive Lesson Modal */}
      <Modal visible={showLessonModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.lessonCard}>
            <View style={styles.lessonHeader}>
              <Text style={styles.lessonStepText}>
                Phrase {activePhraseIndex + 1} of {LESSON_PHRASES.length}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  stopSpeech();
                  setShowLessonModal(false);
                }}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {!lessonCompleted ? (
              <View style={styles.phrasePracticeArea}>
                <View style={styles.audioBubbleRow}>
                  <TouchableOpacity
                    onPress={() => handlePlayAudio(LESSON_PHRASES[activePhraseIndex].phrase, activePhraseIndex)}
                    style={styles.speakerBtn}
                  >
                    <Ionicons
                      name={speakingIndex === activePhraseIndex ? 'volume-high' : 'volume-medium-outline'}
                      size={28}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  <Text style={styles.phraseMainText}>
                    "{LESSON_PHRASES[activePhraseIndex].phrase}"
                  </Text>
                </View>

                <View style={styles.phraseCardBody}>
                  <Text style={styles.meaningLabel}>Meaning:</Text>
                  <Text style={styles.meaningText}>
                    {LESSON_PHRASES[activePhraseIndex].meaning}
                  </Text>

                  <Text style={[styles.meaningLabel, { marginTop: 12 }]}>Example Usage:</Text>
                  <Text style={styles.exampleText}>
                    {LESSON_PHRASES[activePhraseIndex].example}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleNextPhrase}
                  style={styles.nextPhraseBtn}
                  activeOpacity={0.88}
                >
                  <Text style={styles.nextPhraseBtnText}>
                    {activePhraseIndex < LESSON_PHRASES.length - 1 ? 'Next Phrase  →' : 'Complete Lesson & Claim 20 Stars!'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.completionArea}>
                <Text style={{ fontSize: 50, marginBottom: 10 }}>🌟</Text>
                <Text style={styles.completionHeading}>Lesson Complete!</Text>
                <Text style={styles.completionSub}>
                  You earned <Text style={{ fontWeight: '800', color: '#D97706' }}>+20 Stars</Text> for practicing informal greetings.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowLessonModal(false)}
                  style={styles.finishBtn}
                >
                  <Text style={styles.finishBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}
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
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAF9FE',
  },
  pathwayTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pathwayTitleText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  helpCircle: {
    padding: 2,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  timerPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
  },
  historyBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  historyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  skyGradient: {
    flex: 1,
  },
  pathwayScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  unitHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 24,
  },
  unitBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
  },
  pathwayCanvas: {
    position: 'relative',
    minHeight: 520,
  },
  dashedCurveGuide: {
    position: 'absolute',
    top: 40,
    left: '30%',
    width: 2,
    height: 400,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    zIndex: 1,
  },
  milestoneNode: {
    alignItems: 'center',
    zIndex: 2,
  },
  hexagonShape: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  hexagonShapeLocked: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0.15,
  },
  hexagonNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  hexagonLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -2,
  },
  chapterSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 6,
    textAlign: 'center',
  },
  tooltipCalloutBox: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    zIndex: 10,
  },
  tooltipArrowUp: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  tooltipCard: {
    width: '100%', maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
    position: 'relative',
    alignItems: 'center',
  },
  tooltipCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  tooltipTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  tooltipSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  startStarsBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  startStarsBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 16,
  },
  lessonStepText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  phrasePracticeArea: {
    alignItems: 'center',
  },
  audioBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  speakerBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  phraseMainText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  phraseCardBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  meaningLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  meaningText: {
    fontSize: 13.5,
    color: '#1E293B',
    marginTop: 2,
    lineHeight: 18,
  },
  exampleText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 18,
  },
  nextPhraseBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  nextPhraseBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  completionArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  completionSub: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  finishBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
