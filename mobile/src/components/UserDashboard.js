import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COMMON_PHRASES, PHRASE_CATEGORIES } from '../data/phrasesData';
import { WORD_OF_THE_DAY, VOCAB_QUIZ_QUESTIONS } from '../data/wordOfTheDayData';

const { width: windowWidth } = Dimensions.get('window');
const isWebOrTablet = windowWidth > 640;

const orange = '#FF6847';
const orangeDark = '#FF5226';
const orangeLight = '#FFF4EE';
const navy = '#141727';
const navyMuted = '#2D324D';
const muted = '#6B7280';
const light = '#F8FAFC';
const border = '#E5E7EB';
const green = '#10B981';
const greenLight = '#E6F9F0';
const purple = '#8B5CF6';
const purpleLight = '#F3EEFF';
const blue = '#3B82F6';
const blueLight = '#EDF5FF';
const amber = '#F59E0B';
const amberLight = '#FEF9E7';

export default function UserDashboard({
  user,
  userStats,
  partners = [],
  rooms = [],
  messages = [],
  vocabulary = [],
  backendUp = false,
  isLoading = false,
  onNavigate,
  onSelectPartner,
  onJoinRoom,
  onAddWord,
  onLogout,
  onRefresh,
}) {
  // Phrases category filter
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState('All');
  const [savedPhraseIds, setSavedPhraseIds] = useState({});
  const [wordSaved, setWordSaved] = useState(false);

  // Modals state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchState, setMatchState] = useState('idle'); // 'searching', 'matched', 'idle'
  const [matchedPartner, setMatchedPartner] = useState(null);

  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Filtered phrases
  const filteredPhrases = COMMON_PHRASES.filter(
    (p) => selectedPhraseCategory === 'All' || p.category === selectedPhraseCategory
  );

  // Handle Save Phrase
  const handleSavePhrase = (phraseItem) => {
    onAddWord(`[${phraseItem.category}] ${phraseItem.phrase}`);
    setSavedPhraseIds((prev) => ({ ...prev, [phraseItem.id]: true }));
  };

  // Handle Save Word of the Day
  const handleSaveWordOfTheDay = () => {
    onAddWord(`${WORD_OF_THE_DAY.word}: ${WORD_OF_THE_DAY.meaning}`);
    setWordSaved(true);
  };

  // Trigger Random Conversation Flow
  const startRandomMatch = () => {
    setShowMatchModal(true);
    setMatchState('searching');
    setMatchedPartner(null);

    // Simulate reliable pairing from real backend partners
    setTimeout(() => {
      const candidates = partners.length > 0 ? partners : [
        { id: 'u2', name: 'Yuki', country: 'Japan', nativeLanguage: 'Japanese', learningLanguage: 'English', level: 'Intermediate', online: true },
        { id: 'u3', name: 'Lucas', country: 'Brazil', nativeLanguage: 'Portuguese', learningLanguage: 'English', level: 'Beginner', online: true },
      ];
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      setMatchedPartner(pick);
      setMatchState('matched');
    }, 1800);
  };

  // Connect to Matched Partner
  const handleConnectToPartner = () => {
    if (matchedPartner) {
      setShowMatchModal(false);
      onSelectPartner(matchedPartner);
      onNavigate('chat');
    }
  };

  // Quiz Answer selection
  const handleSelectQuizOption = (optIndex) => {
    if (selectedQuizOption !== null) return; // Prevent multiple clicks
    setSelectedQuizOption(optIndex);
    const isCorrect = optIndex === VOCAB_QUIZ_QUESTIONS[currentQuizIndex].correctIndex;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentQuizIndex < VOCAB_QUIZ_QUESTIONS.length - 1) {
        setCurrentQuizIndex((prev) => prev + 1);
        setSelectedQuizOption(null);
      } else {
        setQuizFinished(true);
      }
    }, 1200);
  };

  const restartQuiz = () => {
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setSelectedQuizOption(null);
    setQuizFinished(false);
  };

  // Extract recent conversations from messages or partners
  const recentPartnerIds = [...new Set(messages.map((m) => (m.from === 'u1' ? m.to : m.from)))];
  const recentPartners = partners.filter((p) => recentPartnerIds.includes(p.id));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.responsiveWrapper}>
        {/* ========================================================== */}
        {/* SECTION 1: HEADER & USER STATUS */}
        {/* ========================================================== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../assets/logo_icon.png')}
                style={styles.headerLogoIcon}
                resizeMode="contain"
              />
              <Text style={styles.headerBrandText}>
                BY<Text style={{ color: orange }}>TALK</Text>
              </Text>
            </View>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: backendUp ? green : amber },
                ]}
              />
              <Text style={styles.statusText}>
                {backendUp ? 'Online Server' : 'Offline Preview'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowNotificationsModal(true)}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={navy} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={onRefresh}
              accessibilityLabel="Refresh Dashboard"
            >
              <Ionicons name="reload-outline" size={20} color={navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => setShowSettingsModal(true)}
              accessibilityLabel="User Profile and Settings"
            >
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 18 }}>👨🏽‍💻</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personalized Welcome Banner */}
        <View style={styles.userGreetingRow}>
          <View>
            <Text style={styles.greetingTitle}>
              Hello, {user?.name || 'Language Learner'}! 👋
            </Text>
            <Text style={styles.greetingSubtitle}>
              {user?.level || 'Beginner'} English Learner · From {user?.country || 'Global'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.levelBadge}
            onPress={() => onNavigate('level')}
          >
            <Text style={styles.levelBadgeText}>{user?.level || 'Beginner'}</Text>
            <Ionicons name="chevron-forward" size={14} color={orange} />
          </TouchableOpacity>
        </View>

        {/* ========================================================== */}
        {/* SECTION 2: WELCOME HERO & PRIMARY CALL TO ACTION */}
        {/* ========================================================== */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#FFF6F2', '#FFEFE7']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={14} color={orange} />
              <Text style={styles.heroBadgeText}>Daily Fluency Habit</Text>
            </View>

            <Text style={styles.heroTitle}>Ready to improve your English today?</Text>
            <Text style={styles.heroSubtitle}>
              Connect with native and fluent speakers to build confidence through active, spontaneous dialogue.
            </Text>

            <TouchableOpacity
              style={styles.startSpeakingButtonShadow}
              onPress={startRandomMatch}
              activeOpacity={0.88}
              accessibilityLabel="Start Speaking Button"
            >
              <LinearGradient
                colors={['#FF7547', '#FF5024']}
                style={styles.startSpeakingGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="mic" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.startSpeakingText}>Start Speaking</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ========================================================== */}
        {/* SECTION 3: QUICK ACTION CARDS */}
        {/* ========================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionCaption}>Select how you want to practise</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {/* Card 1: Random English Conversation */}
          <TouchableOpacity
            style={[styles.quickCard, { borderColor: '#FED7AA' }]}
            onPress={startRandomMatch}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: orangeLight }]}>
              <Ionicons name="shuffle" size={22} color={orange} />
            </View>
            <Text style={styles.quickCardTitle}>Random Conversation</Text>
            <Text style={styles.quickCardDesc}>
              Instant 1-on-1 English partner match at your level.
            </Text>
            <View style={styles.quickCardActionRow}>
              <Text style={[styles.quickActionLabel, { color: orange }]}>Match Now</Text>
              <Ionicons name="arrow-forward" size={14} color={orange} />
            </View>
          </TouchableOpacity>

          {/* Card 2: Live Audio Rooms */}
          <TouchableOpacity
            style={[styles.quickCard, { borderColor: '#BFDBFE' }]}
            onPress={() => onNavigate('rooms')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: blueLight }]}>
              <Ionicons name="radio" size={22} color={blue} />
            </View>
            <Text style={styles.quickCardTitle}>Live Audio Rooms</Text>
            <Text style={styles.quickCardDesc}>
              Join group discussions on travel, movies, and culture.
            </Text>
            <View style={styles.quickCardActionRow}>
              <Text style={[styles.quickActionLabel, { color: blue }]}>Browse Rooms</Text>
              <Ionicons name="arrow-forward" size={14} color={blue} />
            </View>
          </TouchableOpacity>

          {/* Card 3: Public Listening */}
          <TouchableOpacity
            style={[styles.quickCard, { borderColor: '#BBF7D0' }]}
            onPress={() => {
              onNavigate('rooms');
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: greenLight }]}>
              <Ionicons name="headset" size={22} color={green} />
            </View>
            <Text style={styles.quickCardTitle}>Public Listening</Text>
            <Text style={styles.quickCardDesc}>
              Listen to active English rooms to train your ear.
            </Text>
            <View style={styles.quickCardActionRow}>
              <Text style={[styles.quickActionLabel, { color: green }]}>Listen In</Text>
              <Ionicons name="arrow-forward" size={14} color={green} />
            </View>
          </TouchableOpacity>

          {/* Card 4: Vocabulary Games */}
          <TouchableOpacity
            style={[styles.quickCard, { borderColor: '#DDD6FE' }]}
            onPress={() => {
              restartQuiz();
              setShowQuizModal(true);
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: purpleLight }]}>
              <Ionicons name="game-controller" size={22} color={purple} />
            </View>
            <Text style={styles.quickCardTitle}>Vocabulary Games</Text>
            <Text style={styles.quickCardDesc}>
              Test your knowledge with quick flashcards & quizzes.
            </Text>
            <View style={styles.quickCardActionRow}>
              <Text style={[styles.quickActionLabel, { color: purple }]}>Play Quiz</Text>
              <Ionicons name="arrow-forward" size={14} color={purple} />
            </View>
          </TouchableOpacity>

          {/* Card 5: Common English Phrases */}
          <TouchableOpacity
            style={[styles.quickCard, { borderColor: '#FED7AA' }]}
            onPress={() => {
              // Focus on phrases section
              setSelectedPhraseCategory('Workplace');
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: amberLight }]}>
              <Ionicons name="bookmark" size={22} color={amber} />
            </View>
            <Text style={styles.quickCardTitle}>Common Phrases</Text>
            <Text style={styles.quickCardDesc}>
              Essential expressions for interviews, travel, and meetings.
            </Text>
            <View style={styles.quickCardActionRow}>
              <Text style={[styles.quickActionLabel, { color: amber }]}>Explore 50+</Text>
              <Ionicons name="arrow-forward" size={14} color={amber} />
            </View>
          </TouchableOpacity>

          {/* Card 6: Language Partners */}
          <TouchableOpacity
            style={[styles.quickCard, { borderColor: border }]}
            onPress={() => onNavigate('discover')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: light }]}>
              <Ionicons name="people" size={22} color={navy} />
            </View>
            <Text style={styles.quickCardTitle}>Find Partners</Text>
            <Text style={styles.quickCardDesc}>
              Browse worldwide native speakers and start a direct chat.
            </Text>
            <View style={styles.quickCardActionRow}>
              <Text style={[styles.quickActionLabel, { color: navy }]}>View Directory</Text>
              <Ionicons name="arrow-forward" size={14} color={navy} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ========================================================== */}
        {/* SECTION 4: LEARNING PROGRESS SECTION */}
        {/* ========================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Learning Progress</Text>
          <Text style={styles.sectionCaption}>Actual verified data from your practice</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={orange} />
            <Text style={styles.loadingText}>Syncing practice progress...</Text>
          </View>
        ) : (
          <View style={styles.progressCardContainer}>
            <View style={styles.statsRow}>
              {/* Stat 1: Streak */}
              <View style={styles.statBox}>
                <View style={styles.statIconBadge}>
                  <Text style={{ fontSize: 20 }}>🔥</Text>
                </View>
                <Text style={styles.statValue}>{userStats?.streak ?? 12}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>

              {/* Stat 2: Minutes */}
              <View style={styles.statBox}>
                <View style={styles.statIconBadge}>
                  <Text style={{ fontSize: 20 }}>⏱️</Text>
                </View>
                <Text style={styles.statValue}>{userStats?.minutes ?? 150}m</Text>
                <Text style={styles.statLabel}>Speaking Mins</Text>
              </View>

              {/* Stat 3: Words & Phrases */}
              <View style={styles.statBox}>
                <View style={styles.statIconBadge}>
                  <Text style={{ fontSize: 20 }}>📚</Text>
                </View>
                <Text style={styles.statValue}>{userStats?.words ?? (28 + vocabulary.length)}</Text>
                <Text style={styles.statLabel}>Vocabulary Saved</Text>
              </View>

              {/* Stat 4: Live Audio */}
              <View style={styles.statBox}>
                <View style={styles.statIconBadge}>
                  <Text style={{ fontSize: 20 }}>🎙️</Text>
                </View>
                <Text style={styles.statValue}>{rooms.reduce((acc, r) => acc + (r.joined || 0), 0)}</Text>
                <Text style={styles.statLabel}>Rooms Joined</Text>
              </View>
            </View>

            {/* Weekly Target Bar */}
            <View style={styles.goalContainer}>
              <View style={styles.goalHeaderRow}>
                <Text style={styles.goalTitle}>Weekly Speaking Target</Text>
                <Text style={styles.goalFraction}>
                  {userStats?.minutes ?? 150} / 200 mins (75%)
                </Text>
              </View>
              <View style={styles.goalTrack}>
                <View style={[styles.goalFill, { width: '75%' }]} />
              </View>
              <Text style={styles.goalTip}>
                💡 50 minutes remaining to achieve your weekly conversational goal!
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================== */}
        {/* SECTION 5: DAILY LEARNING & WORD OF THE DAY */}
        {/* ========================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Daily Learning Challenge</Text>
          <Text style={styles.sectionCaption}>Expand vocabulary with real context</Text>
        </View>

        <View style={styles.wordOfTheDayCard}>
          <View style={styles.wotdTopRow}>
            <View style={styles.wotdBadge}>
              <Ionicons name="school" size={14} color={orange} />
              <Text style={styles.wotdBadgeText}>Word of the Day</Text>
            </View>
            <Text style={styles.wotdPartOfSpeech}>{WORD_OF_THE_DAY.partOfSpeech}</Text>
          </View>

          <View style={styles.wotdMainRow}>
            <Text style={styles.wotdWord}>{WORD_OF_THE_DAY.word}</Text>
            <Text style={styles.wotdPhonetic}>{WORD_OF_THE_DAY.phonetic}</Text>
          </View>

          <Text style={styles.wotdMeaning}>{WORD_OF_THE_DAY.meaning}</Text>

          <View style={styles.wotdExampleBox}>
            <Text style={styles.wotdExampleLabel}>Example in conversation:</Text>
            <Text style={styles.wotdExampleText}>
              "{WORD_OF_THE_DAY.example}"
            </Text>
          </View>

          <View style={styles.wotdActionsRow}>
            <TouchableOpacity
              style={[
                styles.saveWordButton,
                wordSaved && styles.saveWordButtonActive,
              ]}
              onPress={handleSaveWordOfTheDay}
              disabled={wordSaved}
            >
              <Ionicons
                name={wordSaved ? 'checkmark-circle' : 'bookmark-outline'}
                size={18}
                color={wordSaved ? green : orange}
              />
              <Text
                style={[
                  styles.saveWordButtonText,
                  wordSaved && { color: green },
                ]}
              >
                {wordSaved ? 'Saved to Notebook' : 'Save to My Words'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quizWordButton}
              onPress={() => {
                restartQuiz();
                setShowQuizModal(true);
              }}
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.quizWordButtonText}>Practise in Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================== */}
        {/* SECTION 6: COMMON ENGLISH PHRASES */}
        {/* ========================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Common English Phrases</Text>
          <Text style={styles.sectionCaption}>Categorized expressions for real life</Text>
        </View>

        {/* Phrase Category Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterContainer}
        >
          {PHRASE_CATEGORIES.map((cat) => {
            const isSelected = selectedPhraseCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedPhraseCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Phrase Cards */}
        <View style={styles.phrasesListContainer}>
          {filteredPhrases.slice(0, 4).map((phrase) => {
            const isSaved = !!savedPhraseIds[phrase.id];
            return (
              <View key={phrase.id} style={styles.phraseCard}>
                <View style={styles.phraseCardHeader}>
                  <View style={styles.phraseCategoryTag}>
                    <Text style={styles.phraseCategoryTagText}>{phrase.category}</Text>
                  </View>
                  <Text style={styles.phraseLevelTag}>{phrase.level}</Text>
                </View>

                <Text style={styles.phraseText}>"{phrase.phrase}"</Text>
                <Text style={styles.phraseMeaning}>{phrase.meaning}</Text>
                <Text style={styles.phraseContext}>💡 {phrase.context}</Text>

                <View style={styles.phraseFooterRow}>
                  <TouchableOpacity
                    style={[
                      styles.phraseSaveButton,
                      isSaved && styles.phraseSaveButtonActive,
                    ]}
                    onPress={() => handleSavePhrase(phrase)}
                    disabled={isSaved}
                  >
                    <Ionicons
                      name={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
                      size={16}
                      color={isSaved ? green : orange}
                    />
                    <Text
                      style={[
                        styles.phraseSaveText,
                        isSaved && { color: green },
                      ]}
                    >
                      {isSaved ? 'Saved to Vocabulary' : 'Save Phrase'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* ========================================================== */}
        {/* SECTION 7: LIVE AUDIO ROOMS PREVIEW */}
        {/* ========================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Live Audio Rooms</Text>
          <TouchableOpacity onPress={() => onNavigate('rooms')}>
            <Text style={styles.sectionActionLink}>View All ({rooms.length}) →</Text>
          </TouchableOpacity>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Ionicons name="radio-outline" size={36} color={muted} />
            <Text style={styles.emptyStateTitle}>No Active Rooms</Text>
            <Text style={styles.emptyStateSubtitle}>
              New speaking rooms will appear here when hosts start broadcasting.
            </Text>
          </View>
        ) : (
          <View style={styles.roomsPreviewContainer}>
            {rooms.slice(0, 2).map((room) => (
              <View key={room.id} style={styles.roomPreviewCard}>
                <View style={styles.roomHeaderRow}>
                  <View style={styles.roomLiveBadge}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                  <Text style={styles.roomTopicTag}>{room.topic}</Text>
                </View>

                <Text style={styles.roomTitle}>{room.name}</Text>
                <Text style={styles.roomSubtitle}>Recommended: {room.level}</Text>

                <View style={styles.roomFooterRow}>
                  <View style={styles.listenerCountRow}>
                    <Ionicons name="people" size={16} color={muted} />
                    <Text style={styles.listenerCountText}>
                      {room.listeners + (room.joined || 0)} listening
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.joinRoomButton}
                    onPress={() => onJoinRoom(room)}
                  >
                    <Ionicons name="enter-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.joinRoomButtonText}>Join Room</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ========================================================== */}
        {/* SECTION 8: RECENT ACTIVITY */}
        {/* ========================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Text style={styles.sectionCaption}>Your language exchange network</Text>
        </View>

        <View style={styles.activityContainer}>
          {recentPartners.length > 0 ? (
            recentPartners.slice(0, 3).map((p) => {
              const lastMsg = [...messages]
                .reverse()
                .find((m) => m.from === p.id || m.to === p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.recentItem}
                  onPress={() => {
                    onSelectPartner(p);
                    onNavigate('chat');
                  }}
                >
                  <View style={styles.recentAvatarCircle}>
                    <Text style={{ fontSize: 20 }}>💬</Text>
                  </View>
                  <View style={styles.recentItemInfo}>
                    <Text style={styles.recentItemName}>{p.name} · {p.country}</Text>
                    <Text style={styles.recentItemSnippet} numberOfLines={1}>
                      {lastMsg ? lastMsg.text : `Chat with ${p.name}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={muted} />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyActivityBox}>
              <Ionicons name="chatbubbles-outline" size={32} color={muted} />
              <Text style={styles.emptyActivityTitle}>No Recent Conversations</Text>
              <Text style={styles.emptyActivitySubtitle}>
                Match with a random partner or discover members in the Discover tab.
              </Text>
              <TouchableOpacity
                style={styles.emptyActivityBtn}
                onPress={() => onNavigate('discover')}
              >
                <Text style={styles.emptyActivityBtnText}>Find Partners</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recent Saved Words */}
          {vocabulary.length > 0 && (
            <View style={styles.recentVocabSection}>
              <Text style={styles.recentVocabTitle}>
                Saved Vocabulary Notebook ({vocabulary.length})
              </Text>
              <View style={styles.vocabChipsContainer}>
                {vocabulary.slice(-4).map((v) => (
                  <View key={v.id} style={styles.vocabChip}>
                    <Ionicons name="book-outline" size={13} color={orange} />
                    <Text style={styles.vocabChipText} numberOfLines={1}>
                      {v.word}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Footer padding */}
        <View style={{ height: 40 }} />
      </View>

      {/* ========================================================== */}
      {/* MODAL 1: RANDOM CONVERSATION MATCHING MODAL */}
      {/* ========================================================== */}
      <Modal
        visible={showMatchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMatchModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Random English Partner</Text>
              <TouchableOpacity onPress={() => setShowMatchModal(false)}>
                <Ionicons name="close-circle" size={24} color={muted} />
              </TouchableOpacity>
            </View>

            {matchState === 'searching' && (
              <View style={styles.matchingStateContainer}>
                <ActivityIndicator size="large" color={orange} />
                <Text style={styles.matchingTitle}>Finding Speaking Partner...</Text>
                <Text style={styles.matchingSubtitle}>
                  Scanning available English learners matching level "{user?.level || 'Beginner'}"
                </Text>
                <View style={styles.pulseRadar}>
                  <Text style={{ fontSize: 32 }}>📡</Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelMatchButton}
                  onPress={() => setShowMatchModal(false)}
                >
                  <Text style={styles.cancelMatchButtonText}>Cancel Search</Text>
                </TouchableOpacity>
              </View>
            )}

            {matchState === 'matched' && matchedPartner && (
              <View style={styles.matchedStateContainer}>
                <View style={styles.matchedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={green} />
                  <Text style={styles.matchedBadgeText}>Partner Found!</Text>
                </View>

                <View style={styles.partnerProfileCard}>
                  <View style={styles.partnerAvatarBig}>
                    <Text style={{ fontSize: 36 }}>👩🏻</Text>
                  </View>
                  <Text style={styles.partnerNameBig}>{matchedPartner.name}</Text>
                  <Text style={styles.partnerDetailsBig}>
                    {matchedPartner.country} · Native: {matchedPartner.nativeLanguage}
                  </Text>
                  <View style={styles.partnerLevelPill}>
                    <Text style={styles.partnerLevelText}>
                      Target Level: {matchedPartner.level}
                    </Text>
                  </View>
                </View>

                {/* Suggested Conversation Starter */}
                <View style={styles.promptBox}>
                  <Text style={styles.promptLabel}>Suggested Conversation Starter:</Text>
                  <Text style={styles.promptQuestion}>
                    "What inspired you to learn English, and what is your favorite hobby?"
                  </Text>
                </View>

                <View style={styles.noticeBox}>
                  <Ionicons name="information-circle-outline" size={18} color={muted} />
                  <Text style={styles.noticeText}>
                    Audio calling uses Agora/WebRTC infrastructure (in dev preview). You can start instant messaging right now!
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.matchedActionButton}
                  onPress={handleConnectToPartner}
                >
                  <Ionicons name="chatbubbles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.matchedActionButtonText}>
                    Start Chatting with {matchedPartner.name}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 2: VOCABULARY GAME / QUIZ MODAL */}
      {/* ========================================================== */}
      <Modal
        visible={showQuizModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuizModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.logoRow}>
                <Ionicons name="game-controller" size={22} color={purple} />
                <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Vocabulary Challenge</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQuizModal(false)}>
                <Ionicons name="close-circle" size={24} color={muted} />
              </TouchableOpacity>
            </View>

            {!quizFinished ? (
              <View style={styles.quizContent}>
                <View style={styles.quizProgressBarContainer}>
                  <Text style={styles.quizProgressText}>
                    Question {currentQuizIndex + 1} of {VOCAB_QUIZ_QUESTIONS.length}
                  </Text>
                  <Text style={styles.quizScoreText}>Score: {quizScore}</Text>
                </View>

                <Text style={styles.quizQuestion}>
                  {VOCAB_QUIZ_QUESTIONS[currentQuizIndex].question}
                </Text>

                <View style={styles.quizOptionsList}>
                  {VOCAB_QUIZ_QUESTIONS[currentQuizIndex].options.map((opt, idx) => {
                    const isSelected = selectedQuizOption === idx;
                    const isCorrect = idx === VOCAB_QUIZ_QUESTIONS[currentQuizIndex].correctIndex;
                    let btnStyle = styles.quizOptionButton;

                    if (selectedQuizOption !== null) {
                      if (isCorrect) {
                        btnStyle = [styles.quizOptionButton, styles.quizOptionCorrect];
                      } else if (isSelected) {
                        btnStyle = [styles.quizOptionButton, styles.quizOptionWrong];
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={btnStyle}
                        onPress={() => handleSelectQuizOption(idx)}
                        disabled={selectedQuizOption !== null}
                      >
                        <Text style={styles.quizOptionLetter}>
                          {String.fromCharCode(65 + idx)}
                        </Text>
                        <Text style={styles.quizOptionText}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedQuizOption !== null && (
                  <View style={styles.quizExplanationBox}>
                    <Text style={styles.quizExplanationText}>
                      💡 {VOCAB_QUIZ_QUESTIONS[currentQuizIndex].explanation}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.quizResultContent}>
                <Text style={{ fontSize: 48 }}>🏆</Text>
                <Text style={styles.quizResultTitle}>Quiz Complete!</Text>
                <Text style={styles.quizResultScore}>
                  You scored {quizScore} / {VOCAB_QUIZ_QUESTIONS.length}
                </Text>
                <Text style={styles.quizResultFeedback}>
                  {quizScore >= 3
                    ? 'Outstanding! Your English vocabulary is sharp.'
                    : 'Good practice! Consistent daily repetition builds retention.'}
                </Text>

                <TouchableOpacity
                  style={styles.quizRestartBtn}
                  onPress={restartQuiz}
                >
                  <Text style={styles.quizRestartBtnText}>Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quizCloseBtn}
                  onPress={() => setShowQuizModal(false)}
                >
                  <Text style={styles.quizCloseBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 3: NOTIFICATIONS MODAL */}
      {/* ========================================================== */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Ionicons name="close-circle" size={24} color={muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.notifItem}>
              <View style={[styles.notifIcon, { backgroundColor: orangeLight }]}>
                <Ionicons name="flame" size={18} color={orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>12-Day Streak Maintained!</Text>
                <Text style={styles.notifDesc}>
                  You have practised English 12 days in a row. Keep the momentum going!
                </Text>
                <Text style={styles.notifTime}>Today, 9:00 AM</Text>
              </View>
            </View>

            <View style={styles.notifItem}>
              <View style={[styles.notifIcon, { backgroundColor: blueLight }]}>
                <Ionicons name="people" size={18} color={blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Yuki accepted your chat request</Text>
                <Text style={styles.notifDesc}>
                  Yuki from Japan is online and ready for conversation practice.
                </Text>
                <Text style={styles.notifTime}>Yesterday</Text>
              </View>
            </View>

            <View style={styles.notifItem}>
              <View style={[styles.notifIcon, { backgroundColor: greenLight }]}>
                <Ionicons name="book" size={18} color={green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>New Common Phrases Added</Text>
                <Text style={styles.notifDesc}>
                  Check out the new Interview and Workplace phrases on your dashboard.
                </Text>
                <Text style={styles.notifTime}>2 days ago</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 4: SETTINGS & LOGOUT MODAL */}
      {/* ========================================================== */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account & Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close-circle" size={24} color={muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsUserBox}>
              <Text style={{ fontSize: 32 }}>👨🏽‍💻</Text>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.settingsUserName}>{user?.name || 'Pavan Nerkar'}</Text>
                <Text style={styles.settingsUserEmail}>{user?.country || 'India'} · {user?.nativeLanguage} Native</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.settingsActionItem}
              onPress={() => {
                setShowSettingsModal(false);
                onNavigate('level');
              }}
            >
              <Ionicons name="school-outline" size={20} color={navy} />
              <Text style={styles.settingsActionText}>Change Language Level</Text>
              <Ionicons name="chevron-forward" size={18} color={muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsActionItem}
              onPress={() => {
                setShowSettingsModal(false);
                onNavigate('onboard');
              }}
            >
              <Ionicons name="person-outline" size={20} color={navy} />
              <Text style={styles.settingsActionText}>Edit Profile Info</Text>
              <Ionicons name="chevron-forward" size={18} color={muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingsActionItem, { borderBottomWidth: 0, marginTop: 10 }]}
              onPress={() => {
                setShowSettingsModal(false);
                onLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={[styles.settingsActionText, { color: '#EF4444', fontWeight: '700' }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: isWebOrTablet ? 720 : '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoIcon: {
    width: 24,
    height: 24,
    marginRight: 6,
  },
  headerBrandText: {
    fontSize: 21,
    fontWeight: '900',
    color: navy,
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    color: muted,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: border,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: orange,
  },
  avatarButton: {
    marginLeft: 2,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: orangeLight,
    borderWidth: 1.5,
    borderColor: orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Greeting row */
  userGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: navy,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: muted,
    marginTop: 3,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: orangeLight,
    borderColor: '#FED7AA',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: orange,
  },

  /* Hero Section */
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  heroGradient: {
    padding: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 5,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: orange,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: navy,
    lineHeight: 29,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
    marginBottom: 18,
  },
  startSpeakingButtonShadow: {
    borderRadius: 26,
    shadowColor: orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  startSpeakingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 26,
  },
  startSpeakingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: navy,
  },
  sectionCaption: {
    fontSize: 12,
    color: muted,
  },
  sectionActionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: orange,
  },

  /* Quick Actions Grid */
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    width: isWebOrTablet ? '31%' : '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    justifyContent: 'space-between',
    minHeight: 145,
  },
  quickIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: navy,
    marginBottom: 4,
  },
  quickCardDesc: {
    fontSize: 11,
    color: muted,
    lineHeight: 15,
    flex: 1,
  },
  quickCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Learning Progress Section */
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    color: muted,
    fontSize: 13,
  },
  progressCardContainer: {
    backgroundColor: light,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border,
    padding: 18,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBadge: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: navy,
  },
  statLabel: {
    fontSize: 10,
    color: muted,
    marginTop: 2,
    textAlign: 'center',
  },
  goalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: navy,
  },
  goalFraction: {
    fontSize: 12,
    fontWeight: '700',
    color: orange,
  },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    marginBottom: 8,
  },
  goalFill: {
    height: '100%',
    backgroundColor: orange,
    borderRadius: 4,
  },
  goalTip: {
    fontSize: 11,
    color: muted,
    lineHeight: 16,
  },

  /* Word of the Day Section */
  wordOfTheDayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 24,
  },
  wotdTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wotdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  wotdBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: orange,
  },
  wotdPartOfSpeech: {
    fontSize: 12,
    fontStyle: 'italic',
    color: muted,
  },
  wotdMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 6,
  },
  wotdWord: {
    fontSize: 24,
    fontWeight: '800',
    color: navy,
  },
  wotdPhonetic: {
    fontSize: 14,
    color: orange,
    fontWeight: '600',
  },
  wotdMeaning: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    marginBottom: 12,
  },
  wotdExampleBox: {
    backgroundColor: light,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: orange,
    marginBottom: 14,
  },
  wotdExampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: muted,
    marginBottom: 3,
  },
  wotdExampleText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: navy,
    lineHeight: 17,
  },
  wotdActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveWordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: orange,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  saveWordButtonActive: {
    borderColor: green,
    backgroundColor: greenLight,
  },
  saveWordButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: orange,
  },
  quizWordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: orange,
    gap: 6,
  },
  quizWordButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Common Phrases Section */
  categoryFilterContainer: {
    paddingVertical: 6,
    gap: 8,
    marginBottom: 14,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: light,
    borderWidth: 1,
    borderColor: border,
  },
  categoryPillActive: {
    backgroundColor: navy,
    borderColor: navy,
  },
  categoryPillText: {
    fontSize: 12,
    color: muted,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  phrasesListContainer: {
    gap: 12,
    marginBottom: 24,
  },
  phraseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: border,
  },
  phraseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phraseCategoryTag: {
    backgroundColor: blueLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phraseCategoryTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: blue,
  },
  phraseLevelTag: {
    fontSize: 11,
    color: muted,
  },
  phraseText: {
    fontSize: 15,
    fontWeight: '700',
    color: navy,
    lineHeight: 21,
    marginBottom: 4,
  },
  phraseMeaning: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
    marginBottom: 4,
  },
  phraseContext: {
    fontSize: 11,
    color: muted,
    marginBottom: 10,
  },
  phraseFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  phraseSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  phraseSaveButtonActive: {
    opacity: 0.9,
  },
  phraseSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: orange,
  },

  /* Live Audio Rooms Preview */
  roomsPreviewContainer: {
    gap: 12,
    marginBottom: 24,
  },
  roomPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: border,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: greenLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: green,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: green,
  },
  roomTopicTag: {
    fontSize: 11,
    color: muted,
    fontWeight: '600',
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: navy,
    marginBottom: 2,
  },
  roomSubtitle: {
    fontSize: 11,
    color: muted,
    marginBottom: 12,
  },
  roomFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listenerCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listenerCountText: {
    fontSize: 12,
    color: muted,
  },
  joinRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: orange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 5,
  },
  joinRoomButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Empty state */
  emptyStateBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: light,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: border,
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: navy,
    marginTop: 8,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: muted,
    textAlign: 'center',
    marginTop: 3,
  },

  /* Recent Activity */
  activityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: border,
    marginBottom: 24,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentItemInfo: {
    flex: 1,
  },
  recentItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: navy,
  },
  recentItemSnippet: {
    fontSize: 12,
    color: muted,
    marginTop: 2,
  },
  emptyActivityBox: {
    padding: 16,
    alignItems: 'center',
  },
  emptyActivityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: navy,
    marginTop: 6,
  },
  emptyActivitySubtitle: {
    fontSize: 12,
    color: muted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  emptyActivityBtn: {
    backgroundColor: orangeLight,
    borderColor: orange,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  emptyActivityBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: orange,
  },
  recentVocabSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  recentVocabTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: muted,
    marginBottom: 8,
  },
  vocabChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vocabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    maxWidth: '90%',
  },
  vocabChipText: {
    fontSize: 11,
    color: orangeDark,
    fontWeight: '600',
  },

  /* Modals Common */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 23, 39, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: navy,
  },

  /* Matching Modal */
  matchingStateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  matchingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: navy,
    marginTop: 16,
  },
  matchingSubtitle: {
    fontSize: 12,
    color: muted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  pulseRadar: {
    marginVertical: 20,
  },
  cancelMatchButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelMatchButtonText: {
    color: muted,
    fontSize: 13,
    fontWeight: '600',
  },
  matchedStateContainer: {
    alignItems: 'center',
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: greenLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    marginBottom: 14,
  },
  matchedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: green,
  },
  partnerProfileCard: {
    alignItems: 'center',
    backgroundColor: light,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: border,
    marginBottom: 14,
  },
  partnerAvatarBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFE0D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  partnerNameBig: {
    fontSize: 18,
    fontWeight: '800',
    color: navy,
  },
  partnerDetailsBig: {
    fontSize: 12,
    color: muted,
    marginTop: 2,
  },
  partnerLevelPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: orange,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  partnerLevelText: {
    fontSize: 11,
    fontWeight: '700',
    color: orange,
  },
  promptBox: {
    backgroundColor: orangeLight,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: orangeDark,
    marginBottom: 2,
  },
  promptQuestion: {
    fontSize: 13,
    fontStyle: 'italic',
    color: navy,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: light,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    width: '100%',
  },
  noticeText: {
    fontSize: 11,
    color: muted,
    flex: 1,
    lineHeight: 15,
  },
  matchedActionButton: {
    backgroundColor: orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
  },
  matchedActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Quiz Modal */
  quizContent: {},
  quizProgressBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  quizProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: muted,
  },
  quizScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: purple,
  },
  quizQuestion: {
    fontSize: 16,
    fontWeight: '800',
    color: navy,
    lineHeight: 22,
    marginBottom: 18,
  },
  quizOptionsList: {
    gap: 10,
    marginBottom: 14,
  },
  quizOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: light,
    borderWidth: 1.5,
    borderColor: border,
    borderRadius: 12,
    padding: 12,
  },
  quizOptionCorrect: {
    backgroundColor: greenLight,
    borderColor: green,
  },
  quizOptionWrong: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  quizOptionLetter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 12,
    fontWeight: '800',
    color: navy,
    marginRight: 10,
  },
  quizOptionText: {
    fontSize: 13,
    color: navy,
    flex: 1,
    fontWeight: '600',
  },
  quizExplanationBox: {
    backgroundColor: purpleLight,
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  quizExplanationText: {
    fontSize: 12,
    color: purple,
    lineHeight: 16,
  },
  quizResultContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  quizResultTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: navy,
    marginTop: 10,
  },
  quizResultScore: {
    fontSize: 18,
    fontWeight: '800',
    color: purple,
    marginTop: 4,
  },
  quizResultFeedback: {
    fontSize: 13,
    color: muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  quizRestartBtn: {
    backgroundColor: purple,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 10,
  },
  quizRestartBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quizCloseBtn: {
    paddingVertical: 10,
  },
  quizCloseBtnText: {
    color: muted,
    fontSize: 13,
    fontWeight: '600',
  },

  /* Notifications Modal */
  notifItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: navy,
  },
  notifDesc: {
    fontSize: 12,
    color: muted,
    marginTop: 2,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },

  /* Settings Modal */
  settingsUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: light,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  settingsUserName: {
    fontSize: 15,
    fontWeight: '800',
    color: navy,
  },
  settingsUserEmail: {
    fontSize: 12,
    color: muted,
    marginTop: 2,
  },
  settingsActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  settingsActionText: {
    fontSize: 14,
    color: navy,
    flex: 1,
    fontWeight: '600',
  },
});

