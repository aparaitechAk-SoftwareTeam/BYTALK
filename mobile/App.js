import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Image,
  RefreshControl,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { createPeerConnection, getLocalMediaStream, makeIceCandidate, makeSessionDescription, setAudioRoute, startAudioRoute, stopAudioRoute, switchCamera } from './rtc';
import CallAudio from './CallAudio';
import CallVideo from './CallVideo';
import { configureSubscription, purchasePlan, restorePurchases } from './src/subscription';

const welcomeImage = require('./assets/bytalk-welcome-art.png');

// Secure storage adapter:
// Uses Expo SecureStore on native builds (iOS / Android) and AsyncStorage on Web
let ExpoSecureStore = null;
try {
  ExpoSecureStore = require('expo-secure-store');
} catch (e) {
  ExpoSecureStore = null;
}

const SESSION_TOKEN_KEY = 'bytalk_session_token';
const SESSION_USER_KEY = 'bytalk_session_user';
const SESSION_EXPIRES_KEY = 'bytalk_session_expires_at';
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || '';
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || '';

export const authStorage = {
  async setItem(key, value) {
    if (Platform.OS !== 'web' && ExpoSecureStore?.setItemAsync) {
      try {
        await ExpoSecureStore.setItemAsync(key, value);
        return;
      } catch (err) {
        // Fallback to AsyncStorage if SecureStore fails
      }
    }
    await AsyncStorage.setItem(key, value);
  },
  async getItem(key) {
    if (Platform.OS !== 'web' && ExpoSecureStore?.getItemAsync) {
      try {
        const val = await ExpoSecureStore.getItemAsync(key);
        if (val !== null && val !== undefined) return val;
      } catch (err) {
        // Fallback to AsyncStorage
      }
    }
    return AsyncStorage.getItem(key);
  },
  async removeItem(key) {
    if (Platform.OS !== 'web' && ExpoSecureStore?.deleteItemAsync) {
      try {
        await ExpoSecureStore.deleteItemAsync(key);
      } catch (err) {
        // Fallback to AsyncStorage
      }
    }
    await AsyncStorage.removeItem(key);
  },
};

let activeAuthToken = null;

export function getAuthToken() {
  return activeAuthToken;
}

export function setAuthToken(token) {
  activeAuthToken = token;
}

export async function saveSession(authResponse, fallbackName = '') {
  if (!authResponse?.token) {
    throw new Error('Authentication token was not returned by the server.');
  }
  const token = authResponse.token;
  const user = authResponse.user || { name: fallbackName };
  const expiresAt = Date.now() + FIFTEEN_DAYS_MS;

  setAuthToken(token);
  await Promise.all([
    authStorage.setItem(SESSION_TOKEN_KEY, token),
    authStorage.setItem(SESSION_USER_KEY, JSON.stringify(user)),
    authStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt)),
  ]);
}

export async function clearSession() {
  setAuthToken(null);
  await Promise.all([
    authStorage.removeItem(SESSION_TOKEN_KEY).catch(() => {}),
    authStorage.removeItem(SESSION_USER_KEY).catch(() => {}),
    authStorage.removeItem(SESSION_EXPIRES_KEY).catch(() => {}),
  ]);
}

// Runtime-aware API base URL resolution
function getApiUrl() {
  // 1. Explicit environment variable override
  if (process.env.EXPO_PUBLIC_API_URL) {
    const configuredUrl = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
    const isNativeLocalhost = Platform.OS !== 'web' && /:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(configuredUrl);
    if (!isNativeLocalhost) return configuredUrl;
    console.warn('[BYTALK] EXPO_PUBLIC_API_URL uses localhost on a native target; resolving the Expo host instead.');
  }

  // 2. Web browser runtime
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:4000`;
      }
    }
    return 'http://localhost:4000';
  }

  // 3. Android Emulator / Device
  if (Platform.OS === 'android') {
    let metroHost = null;
    try {
      const Constants = require('expo-constants').default;
      const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri || Constants?.manifest?.debuggerHost;
      if (hostUri) metroHost = hostUri.split(':')[0];
    } catch (e) {}

    if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
      return `http://${metroHost}:4000`;
    }
    return 'http://10.0.2.2:4000';
  }

  // 4. iOS Simulator / Device
  if (Platform.OS === 'ios') {
    let metroHost = null;
    try {
      const Constants = require('expo-constants').default;
      const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri || Constants?.manifest?.debuggerHost;
      if (hostUri) metroHost = hostUri.split(':')[0];
    } catch (e) {}

    if (metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1') {
      return `http://${metroHost}:4000`;
    }
    return 'http://localhost:4000';
  }

  return 'http://localhost:4000';
}

const API = getApiUrl();

// Section 3: Orange Design System Palette
const COLORS = {
  primary: '#FF693D',
  secondary: '#FF8A50',
  lightBg: '#FFF7F2',
  softSurface: '#FFF0E8',
  textPrimary: '#17172F',
  textSecondary: '#747487',
  border: '#E9E7EF',
  white: '#FFFFFF',
  error: '#D92D20',
  success: '#168653',
};

const orange = COLORS.primary;
const orangeLight = COLORS.lightBg;
const navy = COLORS.textPrimary;
const muted = COLORS.textSecondary;
const light = COLORS.lightBg;
const border = COLORS.border;

const LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Spanish', 'French', 'Japanese',
  'Mandarin Chinese', 'Arabic', 'German', 'Portuguese', 'Bengali',
  'Russian', 'Urdu', 'Indonesian', 'Korean', 'Italian', 'Turkish',
  'Tamil', 'Telugu', 'Vietnamese', 'Polish', 'Dutch', 'Greek',
  'Hebrew', 'Thai', 'Swedish', 'Czech', 'Hungarian', 'Romanian',
  'Danish', 'Finnish', 'Norwegian', 'Swahili', 'Malay', 'Ukrainian',
];

const PRACTICE_TOPICS = [
  {
    id: 'All Topics', title: 'All', icon: 'apps-outline',
    description: 'Discover every registered partner with saved interests.',
    phrases: ['Nice to meet you.', 'What do you enjoy?', 'How was your day?'],
    vocabulary: ['conversation', 'practice', 'partner'],
    prompt: 'Which phrase is a friendly way to start a conversation?',
    options: ['Nice to meet you.', 'Where is the station?', 'I will send an update.'],
    answer: 'Nice to meet you.',
  },
  {
    id: 'Education', title: 'Education', icon: 'school-outline',
    description: 'Study, exams, and academic discussions.',
    phrases: ['Where is the station?', 'Could I have a ticket?', 'How long does it take?'],
    vocabulary: ['journey', 'ticket', 'platform'],
    prompt: 'Choose a phrase to ask for help understanding a lesson.',
    options: ['Could you explain that?', 'Where is the station?', 'That sounds fun!'],
    answer: 'Could you explain that?',
  },
  {
    id: 'Travel', title: 'Travel', icon: 'airplane-outline',
    description: 'Destinations, journeys, and travel experiences.',
    phrases: ['Where is the station?', 'Could I have a ticket?', 'How long does it take?'],
    vocabulary: ['journey', 'ticket', 'platform'],
    prompt: 'Which phrase asks for directions?',
    options: ['Where is the station?', 'I enjoy cooking.', 'Nice to meet you.'],
    answer: 'Where is the station?',
  },
  {
    id: 'Culture', title: 'Culture', icon: 'globe-outline',
    description: 'Culture, traditions, food, and communities.',
    phrases: ['What is this tradition?', 'I would love to learn more.', 'That is interesting.'],
    vocabulary: ['tradition', 'festival', 'community'],
    prompt: 'Which word describes a custom passed down over time?',
    options: ['tradition', 'platform', 'assignment'],
    answer: 'tradition',
  },
  {
    id: 'Work & Career', title: 'Work & Career', icon: 'briefcase-outline',
    description: 'Jobs, careers, and professional discussions.',
    phrases: ['I work in ...', 'Let us discuss this.', 'I will send an update.'],
    vocabulary: ['colleague', 'meeting', 'deadline'],
    prompt: 'Which word means the latest time something should be finished?',
    options: ['deadline', 'colleague', 'meeting'],
    answer: 'deadline',
  },
  {
    id: 'Hobbies', title: 'Hobbies', icon: 'color-palette-outline',
    description: 'Interests, creativity, and free-time activities.',
    phrases: ['What do you enjoy?', 'I like listening to music.', 'That sounds fun!'],
    vocabulary: ['interest', 'creative', 'outdoors'],
    prompt: 'How can you ask someone about their interests?',
    options: ['What do you enjoy?', 'Could I have a ticket?', 'I will send an update.'],
    answer: 'What do you enjoy?',
  },
  {
    id: 'Movies & Music', title: 'Movies & Music', icon: 'musical-notes-outline',
    description: 'Share recommendations and discuss entertainment.',
    phrases: ['What are you watching?', 'What kind of music do you like?', 'I recommend ...'],
    vocabulary: ['recommendation', 'actor', 'concert'],
    prompt: 'Which phrase asks about someone’s music preferences?',
    options: ['What kind of music do you like?', 'Where is the station?', 'I work in ...'],
    answer: 'What kind of music do you like?',
  },
  {
    id: 'Technology', title: 'Technology', icon: 'hardware-chip-outline',
    description: 'Technology, programming, and digital ideas.',
    phrases: ['What app do you use?', 'I am learning to code.', 'How does it work?'],
    vocabulary: ['software', 'programming', 'device'],
    prompt: 'Which phrase says that you are learning programming?',
    options: ['I am learning to code.', 'That sounds fun!', 'Could I have a ticket?'],
    answer: 'I am learning to code.',
  },
  {
    id: 'Daily Life', title: 'Daily Life', icon: 'home-outline',
    description: 'Everyday routines, errands, and practical conversation.',
    phrases: ['How was your day?', 'What do you usually do?', 'I am heading home.'],
    vocabulary: ['routine', 'errand', 'neighborhood'],
    prompt: 'Which phrase asks about someone’s routine?',
    options: ['What do you usually do?', 'I recommend ...', 'Where is the station?'],
    answer: 'What do you usually do?',
  },
];

const COUNTRY_CODES = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE',
  'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI', 'CV', 'KH', 'CM', 'CA', 'CF', 'TD',
  'CL', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'HR', 'CU', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC',
  'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FJ', 'FI', 'FR', 'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD',
  'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP',
  'JO', 'KZ', 'KE', 'KI', 'KP', 'KR', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU',
  'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ',
  'MM', 'NA', 'NR', 'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'MK', 'NO', 'OM', 'PK', 'PW', 'PA', 'PG', 'PY',
  'PE', 'PH', 'PL', 'PT', 'QA', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS',
  'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD', 'SR', 'SE', 'CH', 'SY', 'TW',
  'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UY',
  'UZ', 'VU', 'VA', 'VE', 'VN', 'YE', 'ZM', 'ZW',
];

const COUNTRY_OPTIONS = (() => {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return COUNTRY_CODES.map((code) => ({ code, name: displayNames.of(code) || code }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return COUNTRY_CODES.map((code) => ({ code, name: code }));
  }
})();

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (activeAuthToken) {
    headers['Authorization'] = `Bearer ${activeAuthToken}`;
  }

  let response;
  try {
    response = await fetch(`${API}/api/${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    const error = new Error(`Cannot connect to backend server at ${API}. Please ensure the backend is running.`);
    error.isNetworkError = true;
    error.originalError = netErr;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  let responseWasJson = false;
  try {
    if (contentType.includes('application/json')) {
      responseWasJson = true;
      data = await response.json();
    } else {
      await response.text();
      data = { error: `The backend returned an unexpected response (${response.status}).` };
    }
  } catch (jsonErr) {
    data = { error: 'Invalid response from server' };
  }

  // Handle session revocation or expiry from server
  if (response.status === 401 && activeAuthToken && endpoint !== 'login' && endpoint !== 'register') {
    await clearSession();
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Server responded with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    err.userMessage = responseWasJson
      ? message
      : 'The subscription service returned an unexpected response. Check that the backend is running on port 4000.';
    throw err;
  }
  return data;
}

const Txt = ({ children, size = 14, color = navy, bold = false, style = {} }) => (
  <Text style={{ fontSize: size, color, fontWeight: bold ? '700' : '400', ...style }}>{children}</Text>
);

const Btn = ({ label, onPress, outline = false, disabled = false, loading = false, style = {} }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    disabled={disabled || loading}
    style={{
      backgroundColor: outline ? '#fff' : orange,
      borderWidth: outline ? 1.5 : 0,
      borderColor: orange,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.65 : 1,
      ...style,
    }}
  >
    {loading ? (
      <ActivityIndicator size="small" color={outline ? orange : '#fff'} />
    ) : (
      <Txt color={outline ? orange : '#fff'} bold size={15}>{label}</Txt>
    )}
  </TouchableOpacity>
);

function SearchSelect({ label, value, options, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = options.filter((option) => {
    const name = typeof option === 'string' ? option : option.name;
    return name.toLowerCase().includes(query.trim().toLowerCase());
  });

  return (
    <View style={{ marginBottom: 15, zIndex: open ? 2 : 1 }}>
      <Txt size={13} bold style={{ marginBottom: 8 }}>{label}</Txt>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label} selector`}
        onPress={() => {
          setOpen((current) => !current);
          setQuery('');
        }}
        style={{
          backgroundColor: '#fff',
          borderColor: open ? orange : border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 15,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Txt color={value ? navy : '#9CA3AF'} size={15}>{value || placeholder}</Txt>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={muted} />
      </TouchableOpacity>
      {open && (
        <View style={{ backgroundColor: '#fff', borderColor: border, borderWidth: 1, borderRadius: 14, marginTop: 6, overflow: 'hidden' }}>
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${label.toLowerCase()}...`}
            placeholderTextColor="#9CA3AF"
            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: border, color: navy }}
          />
          <ScrollView nestedScrollEnabled style={{ maxHeight: 190 }}>
            {filtered.map((option) => {
              const optionName = typeof option === 'string' ? option : option.name;
              return (
                <TouchableOpacity
                  key={typeof option === 'string' ? option : option.code}
                  onPress={() => {
                    onSelect(optionName);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 11, backgroundColor: optionName === value ? '#FFF0E8' : '#fff' }}
                >
                  <Txt color={optionName === value ? orange : navy} bold={optionName === value}>{optionName}</Txt>
                </TouchableOpacity>
              );
            })}
            {!filtered.length && <Txt color={muted} size={13} style={{ padding: 14 }}>No matching options.</Txt>}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const Section = ({ title, children }) => (
  <View style={{ marginBottom: 22 }}>
    <Txt size={16} bold style={{ marginBottom: 12 }}>{title}</Txt>
    {children}
  </View>
);

function App() {
  const { height: viewportHeight } = useWindowDimensions();
  const isShortViewport = viewportHeight < 560;
  const welcomeIllustrationHeight = Math.max(110, Math.min(180, viewportHeight * 0.34));
  const [screen, setScreen] = useState('welcome');
  const [sessionChecking, setSessionChecking] = useState(true);
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [learningLanguage, setLearningLanguage] = useState('English');
  const [level, setLevel] = useState('Beginner');
  const [practiceInterests, setPracticeInterests] = useState([]);
  const [practiceInterestsSaving, setPracticeInterestsSaving] = useState(false);
  const [partners, setPartners] = useState([]);
  const [partnerTotalEligible, setPartnerTotalEligible] = useState(0);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverRefreshing, setDiscoverRefreshing] = useState(false);
  const [discoverError, setDiscoverError] = useState('');
  const [practiceTopic, setPracticeTopic] = useState(PRACTICE_TOPICS[0]);
  const [practiceStep, setPracticeStep] = useState('overview');
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceProgress, setPracticeProgress] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({ id: null, name: 'BYTALK' });
  const [messages, setMessages] = useState([]);
  const [unreadByUser, setUnreadByUser] = useState({});
  const [conversations, setConversations] = useState([]);
  const [messageBanner, setMessageBanner] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [vocab, setVocab] = useState([]);
  const [word, setWord] = useState('');
  const [backendUp, setBackendUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [messageLoading, setMessageLoading] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [chatError, setChatError] = useState('');
  const [typing, setTyping] = useState(false);
  const [call, setCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [callHistoryError, setCallHistoryError] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [callNotice, setCallNotice] = useState('');
  const [callStarting, setCallStarting] = useState(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const localStreamRef = useRef(null);
  const iceServersRef = useRef([]);
  const pendingIceRef = useRef([]);
  const pendingOutgoingIceRef = useRef([]);
  const signalQueueRef = useRef(Promise.resolve());
  const selectedRef = useRef(selected);
  const userIdRef = useRef(userId);
  const screenRef = useRef(screen);
  const typingTimerRef = useRef(null);
  const callExitTimerRef = useRef(null);
  const partnersRef = useRef(partners);
  const discoverRequestRef = useRef(0);
  const seenMessageIdsRef = useRef(new Set());
  selectedRef.current = selected;
  userIdRef.current = userId;
  screenRef.current = screen;
  callRef.current = call;
  partnersRef.current = partners;

  // Auth form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regError, setRegError] = useState('');

  const [authBusy, setAuthBusy] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  // Reliable Health Check (/api/health)
  const checkHealth = async () => {
    try {
      const res = await request('health');
      if (res && res.ok) {
        setBackendUp(true);
        return true;
      }
      setBackendUp(false);
      return false;
    } catch (e) {
      setBackendUp(false);
      return false;
    }
  };

  const refresh = async () => {
    try {
      const isUp = await checkHealth();
      if (isUp) {
        const [v] = await Promise.all([
          activeAuthToken ? request(`vocabulary/${userId}`).catch(() => []) : Promise.resolve([]),
        ]);
        setVocab(v);
      }
    } catch {
      setBackendUp(false);
    }
  };

  async function loadSubscription() {
    setSubscriptionLoading(true);
    setSubscriptionError('');
    try {
      const [plans, current] = await Promise.all([
        request('subscription/plans'),
        request('subscription/status'),
      ]);
      setSubscriptionPlans(Array.isArray(plans) ? plans : []);
      setSubscription(current);
    } catch (error) {
      setSubscriptionError(error.userMessage || error.message || 'Subscription status is unavailable.');
    } finally {
      setSubscriptionLoading(false);
    }

  }

  function hasVideoEntitlement() {
    if (!subscription || !['plus', 'pro'].includes(subscription.plan?.id)) return false;
    if (!['active', 'cancelled'].includes(subscription.status)) return false;
    return !subscription.expiresAt || new Date(subscription.expiresAt) > new Date();
  }

  async function openSubscription() {
    setSubscriptionError('');
    await loadSubscription();
    setScreen('premium');
  }

  async function buySubscription(plan) {
    setSubscriptionBusy(true);
    setSubscriptionError('');
    try {
      const configured = await configureSubscription(userId);
      if (!configured.available) throw new Error(configured.reason);
      await purchasePlan(plan);
      await loadSubscription();
      Alert.alert('Purchase submitted', 'Your entitlement will unlock after the store provider confirms it.');
    } catch (error) {
      setSubscriptionError(error.message || 'Purchase could not be completed.');
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function restoreSubscription() {
    setSubscriptionBusy(true);
    setSubscriptionError('');
    try {
      const configured = await configureSubscription(userId);
      if (!configured.available) throw new Error(configured.reason);
      await restorePurchases();
      await loadSubscription();
      Alert.alert('Restore submitted', 'Your provider entitlement will appear after server verification.');
    } catch (error) {
      setSubscriptionError(error.message || 'Purchases could not be restored.');
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function grantDevelopmentSubscription(plan) {
      setSubscriptionBusy(true);
      setSubscriptionError('');
      try {
        const current = await request('subscription/development/grant', {
          method: 'POST',
          body: JSON.stringify({ plan }),
        });
        setSubscription(current);
        Alert.alert('Development entitlement granted', `${current.plan.name} is active for local testing only.`);
      } catch (error) {
        setSubscriptionError(error.message || 'Development entitlement could not be granted.');
      } finally {
        setSubscriptionBusy(false);
      }
    }

  async function loadDiscoverUsers(refreshing = false, topic = 'All Topics') {
    const requestId = ++discoverRequestRef.current;
    if (!activeAuthToken) {
      setPartners([]);
      setDiscoverError('Sign in to discover registered BYTALK users.');
      setDiscoverLoading(false);
      setDiscoverRefreshing(false);
      return;
    }

    if (refreshing) setDiscoverRefreshing(true);
    setDiscoverLoading(true);
    setDiscoverError('');
    try {
      const result = await request(`users/discover?topic=${encodeURIComponent(topic)}`);
      if (requestId !== discoverRequestRef.current) return;
      const users = Array.isArray(result) ? result : result?.users;
      setPartners(Array.isArray(users) ? users : []);
      setPartnerTotalEligible(Number(result?.totalEligible) || (Array.isArray(users) ? users.length : 0));
      setDiscoverError('');
    } catch (error) {
      if (requestId !== discoverRequestRef.current) return;
      setDiscoverError(error.message || 'Could not load registered users. Check your connection and retry.');
      if (error.status === 401) {
        setPartners([]);
        setPartnerTotalEligible(0);
        setSessionVersion((value) => value + 1);
        setScreen('welcome');
      }
    } finally {
      if (requestId === discoverRequestRef.current) {
        setDiscoverLoading(false);
        setDiscoverRefreshing(false);
      }
    }
  }

  function updateCall(next) {
    setCall((previous) => {
      const value = typeof next === 'function' ? next(previous) : next;
      callRef.current = value;
      return value;
    });
  }

  function releaseCallMedia() {
    const connection = peerRef.current?.connection;
    if (connection) {
      connection.onicecandidate = null;
      connection.ontrack = null;
      connection.onconnectionstatechange = null;
      connection.oniceconnectionstatechange = null;
      connection.close();
    }

    peerRef.current = null;
    pendingIceRef.current = [];
    pendingOutgoingIceRef.current = [];
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    stopAudioRoute();
    setMuted(false);
    setCameraEnabled(true);
    setSpeakerEnabled(false);
  }

  async function notifyIncomingMessage(message) {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'granted' && document.hidden) {
        new Notification('New BYTALK message', { body: String(message.text || '').slice(0, 120) });
      }
    } catch (error) {
      console.warn('[BYTALK notification] unavailable', error?.message || 'permission denied');
    }
  }

  function refreshConversations() {
    return request('messages/conversations')
      .then(setConversations)
      .catch((error) => console.warn('[BYTALK message] conversation list failed', error.message));
  }

  function conversationForMessage(message) {
    const partner = partnersRef.current.find((item) => item.id === message.from);
    return {
      id: message.from,
      name: partner?.name || partner?.displayName || 'BYTALK user',
      displayName: partner?.displayName || partner?.name || 'BYTALK user',
      avatarUrl: partner?.avatarUrl || null,
      country: partner?.country || '',
      learningLanguage: partner?.learningLanguage || '',
      online: Boolean(partner?.online),
    };
  }

  function openConversation(partner) {
    setSelected(partner);
    setChatError('');
    setMessageBanner(null);
    setScreen('chat');
  }

  async function requestNotificationPermission() {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.warn('[BYTALK notification] permission request unavailable', error?.message || 'permission denied');
    }
  }

  async function notifyIncomingCall(incoming) {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission === 'granted' && document.hidden) {
        new Notification(`Incoming ${incoming.type} call`, {
          body: `${incoming.caller?.name || 'A BYTALK user'} is calling you.`,
        });
      }
    } catch (error) {
      console.warn('[BYTALK notification] incoming call unavailable', error?.message || 'permission denied');
    }
  }

  function createCallPeer(callId, stream, iceServers) {
    const connection = createPeerConnection(iceServers);
    console.log('[BYTALK call] peer created', {
      callId,
      iceServerCount: iceServers.length,
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
    });
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    peerRef.current = { callId, connection };
    connection.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
      const callIdForCandidate = peerRef.current?.callId;
      if (!callIdForCandidate) {
        pendingOutgoingIceRef.current.push(candidate);
        return;
      }
      console.log('[BYTALK call] signaling ICE candidate', { callId: callIdForCandidate });
      socketRef.current?.emit('call:signal', {
        callId: callIdForCandidate,
        kind: 'ice',
        signal: candidate,
      }, (response) => {
        if (response?.error) {
          console.warn('[BYTALK call] ICE candidate rejected', response.error);
        }
      });
    };
    connection.ontrack = (event) => {
      console.log('[BYTALK call] remote track received', { callId: peerRef.current?.callId, kind: event.track?.kind });
      if (event.streams?.[0]) setRemoteStream(event.streams[0]);
    };
    const updateConnectionState = () => {
      const state = connection.connectionState;
      const iceState = connection.iceConnectionState;
      console.log('[BYTALK call] peer state', { callId: peerRef.current?.callId, state, iceState });
      const mediaConnected = state === 'connected'
        || ((iceState === 'connected' || iceState === 'completed') && !['failed', 'closed'].includes(state));
      if (mediaConnected) {
        updateCall((previous) => previous ? { ...previous, status: 'Connected', connectedAt: previous.connectedAt || new Date().toISOString() } : previous);
        socketRef.current?.emit('call:connected', { callId: peerRef.current?.callId });
      } else if (state === 'disconnected' || iceState === 'disconnected') {
        updateCall((previous) => previous ? { ...previous, status: 'Reconnecting' } : previous);
      } else if (state === 'failed' || iceState === 'failed') {
        const notice = 'The media connection failed. Check your network or TURN server configuration.';
        setCallNotice(notice);
        endCall(notice);
      } else if (state === 'connecting' || iceState === 'checking') {
        updateCall((previous) => previous ? { ...previous, status: 'Connecting' } : previous);
      }
    };
    connection.onconnectionstatechange = updateConnectionState;
    connection.oniceconnectionstatechange = updateConnectionState;
    return connection;
  }

  async function createCallOffer(callId) {
    try {
      const connection = peerRef.current?.connection;
      if (!connection || peerRef.current.callId !== callId) return;
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      console.log('[BYTALK call] signaling offer', { callId });
      socketRef.current?.emit('call:signal', { callId, kind: 'offer', signal: connection.localDescription || offer });
      updateCall((previous) => previous ? { ...previous, status: 'Connecting' } : previous);
    } catch (error) {
      setCallNotice(error.message || 'Could not start the media connection.');
    }
  }

  async function processCallSignal({ callId, kind, signal }) {
    const connection = peerRef.current?.connection;
    if (!connection || peerRef.current.callId !== callId) return;
    console.log('[BYTALK call] signaling received', { callId, kind });
    try {
      if (kind === 'offer') {
        await connection.setRemoteDescription(makeSessionDescription(signal));
        for (const candidate of pendingIceRef.current.splice(0)) {
          await connection.addIceCandidate(makeIceCandidate(candidate));
        }
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        console.log('[BYTALK call] signaling answer', { callId });
        socketRef.current?.emit('call:signal', { callId, kind: 'answer', signal: connection.localDescription || answer });
        updateCall((previous) => previous ? { ...previous, status: 'Connecting' } : previous);
      } else if (kind === 'answer') {
        await connection.setRemoteDescription(makeSessionDescription(signal));
        for (const candidate of pendingIceRef.current.splice(0)) {
          await connection.addIceCandidate(makeIceCandidate(candidate));
        }
      } else if (kind === 'ice') {
        if (connection.remoteDescription) {
          await connection.addIceCandidate(makeIceCandidate(signal));
        } else {
          pendingIceRef.current.push(signal);
        }
      }
    } catch (error) {
      setCallNotice(error.message || 'Could not negotiate the media connection.');
    }
  }

  function handleCallSignal(signal) {
    signalQueueRef.current = signalQueueRef.current
      .catch(() => {})
      .then(() => processCallSignal(signal));
  }

  function finishCallLocally(status, notice = '') {
    if (callExitTimerRef.current) clearTimeout(callExitTimerRef.current);
    setCallNotice(notice);
    releaseCallMedia();
    updateCall((previous) => previous ? { ...previous, status } : previous);
    request('calls').then(setCallHistory).catch((error) => {
      setCallHistoryError(error.message || 'Call ended, but call history could not be refreshed.');
    });
    callExitTimerRef.current = setTimeout(() => {
      updateCall(null);
      setScreen('discover');
    }, 1800);
  }

  function emitWithAck(event, payload) {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        reject(new Error('Real-time service is disconnected. Reconnect and try again.'));
        return;
      }
      socket.timeout(12000).emit(event, payload, (timeoutError, response) => {
        if (timeoutError) {
          reject(new Error('The server did not respond. Please try again.'));
        } else if (response?.error) {
          const error = new Error(response.error);
          error.code = response.code;
          reject(error);
        } else {
          resolve(response || {});
        }
      });
    });
  }

  async function startCall(partner, type) {
    console.log('[BYTALK call] button pressed', { partnerId: partner?.id, type });
    if (!activeAuthToken) {
      Alert.alert('Sign in required', 'Sign in before starting a private call.');
      return;
    }
    if (type === 'video' && !hasVideoEntitlement()) {
      setSubscriptionError('BYTALK Plus or Pro is required for one-to-one video-call practice.');
      await openSubscription();
      return;
    }
    if (!socketRef.current?.connected) {
      Alert.alert('Call unavailable', 'The real-time service is disconnected. Please reconnect and try again.');
      return;
    }
    setCallStarting({ partnerId: partner.id, type });
    setCallNotice('Requesting microphone and camera permission…');
    try {
      console.log('[BYTALK call] requesting media', { type });
      const rtcConfig = await request('rtc-config');
      iceServersRef.current = rtcConfig.iceServers || [];
      const stream = await getLocalMediaStream(type);
      console.log('[BYTALK call] media ready', {
        audio: stream.getAudioTracks().length,
        video: stream.getVideoTracks().length,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const initialCall = { id: null, peer: partner, type, direction: 'outgoing', status: 'Calling' };
      updateCall(initialCall);
      setCallNotice(type === 'video' && !stream.getVideoTracks().length
        ? 'Camera unavailable; this call will continue with audio only.'
        : '');
      setCameraEnabled(stream.getVideoTracks().length > 0);
      setSelected(partner);
      setScreen('call');
      const speaker = type === 'video';
      startAudioRoute(type, speaker);
      setSpeakerEnabled(speaker);
      createCallPeer(null, stream, iceServersRef.current);
      console.log('[BYTALK call] sending call:invite', { to: partner.id, type });
      const result = await emitWithAck('call:invite', { to: partner.id, type });
      console.log('[BYTALK call] invite acknowledged', { callId: result.callId });
      if (!peerRef.current || callRef.current?.peer.id !== partner.id || callRef.current?.status === 'Ended') {
        socketRef.current?.emit('call:end', { callId: result.callId });
        return;
      }
      peerRef.current.callId = result.callId;
      const queuedCandidates = pendingOutgoingIceRef.current.splice(0);
      for (const candidate of queuedCandidates) {
        socketRef.current?.emit('call:signal', {
          callId: result.callId,
          kind: 'ice',
          signal: candidate,
        }, (response) => {
          if (response?.error) {
            console.warn('[BYTALK call] queued ICE candidate rejected', response.error);
          }
        });
      }
      updateCall((previous) => previous ? { ...previous, id: result.callId, status: 'Ringing' } : previous);
    } catch (error) {
      console.warn('[BYTALK call] failed', error.message || error);
      releaseCallMedia();
      updateCall(null);
      setScreen('discover');
      if (error.code === 'video_plan_required') {
        setSubscriptionError(error.message);
        setScreen('premium');
      } else {
        Alert.alert('Could not start call', error.message || 'Check your connection and permissions.');
      }
    } finally {
      setCallStarting(null);
    }
  }

  async function acceptCall() {
    const incoming = callRef.current;
    if (!incoming?.id || incoming.direction !== 'incoming') return;
    try {
      const rtcConfig = await request('rtc-config');
      iceServersRef.current = rtcConfig.iceServers || [];
      const stream = await getLocalMediaStream(incoming.type);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraEnabled(stream.getVideoTracks().length > 0);
      if (incoming.type === 'video' && !stream.getVideoTracks().length) {
        setCallNotice('Camera unavailable; accepting with audio only.');
      }
      const speaker = incoming.type === 'video';
      startAudioRoute(incoming.type, speaker);
      setSpeakerEnabled(speaker);
      createCallPeer(incoming.id, stream, iceServersRef.current);
      await emitWithAck('call:accept', { callId: incoming.id });
      updateCall((previous) => previous ? { ...previous, status: 'Connecting' } : previous);
    } catch (error) {
      releaseCallMedia();
      socketRef.current?.emit('call:reject', { callId: incoming.id });
      finishCallLocally('Ended', error.message || 'Could not accept this call.');
    }
  }

  async function rejectCall() {
    const incoming = callRef.current;
    if (!incoming?.id) return;
    let notice = '';
    try {
      await emitWithAck('call:reject', { callId: incoming.id });
    } catch (error) {
      notice = error.message;
    }
    finishCallLocally('Ended', notice);
  }

  async function endCall(notice = '') {
    const currentCall = callRef.current;
    if (!currentCall) return;
    if (currentCall.id) {
      try {
        await emitWithAck('call:end', { callId: currentCall.id });
      } catch (error) {
        notice = notice ? `${notice} ${error.message}` : error.message;
      }
    }
    finishCallLocally('Ended', notice);
  }

  // RESTORE SESSION ON APP OPEN (Requirement 7 & 11)
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const [token, expiryStr, savedUserStr] = await Promise.all([
          authStorage.getItem(SESSION_TOKEN_KEY),
          authStorage.getItem(SESSION_EXPIRES_KEY),
          authStorage.getItem(SESSION_USER_KEY),
        ]);

        const expiry = Number(expiryStr);
        // Fast client check: if no token or local 15-day expiry passed, clear session
        if (!token || !Number.isFinite(expiry) || Date.now() >= expiry) {
          await clearSession();
          if (active) {
            setScreen('welcome');
            setSessionChecking(false);
          }
          return;
        }

        // Set token in memory to validate against backend
        setAuthToken(token);

        // Validate token cryptographically against backend (Requirement 11)
        const meRes = await request('auth/me');
        if (!active) return;

        if (meRes && meRes.ok && meRes.user) {
          if (meRes.user.id) setUserId(meRes.user.id);
          if (meRes.user.name) setName(meRes.user.name);
          if (meRes.user.country) setCountry(meRes.user.country);
          if (meRes.user.nativeLanguage) setNativeLanguage(meRes.user.nativeLanguage);
          if (meRes.user.learningLanguage) setLearningLanguage(meRes.user.learningLanguage);
          if (meRes.user.level) setLevel(meRes.user.level);
          setPracticeInterests(Array.isArray(meRes.user.practiceInterests) ? meRes.user.practiceInterests : []);
          await authStorage.setItem(SESSION_USER_KEY, JSON.stringify(meRes.user));
          setScreen('discover');
        } else {
          await clearSession();
          setScreen('welcome');
        }
      } catch (err) {
        // Backend validation failed (expired, revoked, or server unavailable)
        if (active) {
          await clearSession();
          setScreen('welcome');
        }
      } finally {
        if (active) setSessionChecking(false);
      }
    }

    restoreSession();
    refresh();

    return () => {
      active = false;
      socketRef.current?.emit('typing:stop', { to: selected.id });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (sessionChecking) return undefined;
    let active = true;
    let socket;

    async function connectSocket() {
      const token = activeAuthToken || await authStorage.getItem(SESSION_TOKEN_KEY);
      if (!active || !token) return;
      socket = io(API, { auth: { token }, transports: ['websocket', 'polling'], autoConnect: false });
      socketRef.current = socket;
      socket.on('connect', () => {
        console.log('[BYTALK socket] connected', { api: API });
        loadSubscription();
        request('messages/unread')
          .then(setUnreadByUser)
          .catch((error) => console.warn('[BYTALK message] unread count failed', error.message));
        refreshConversations();
        if (screenRef.current === 'chat' && selectedRef.current.id && userIdRef.current) {
          request(`messages/${userIdRef.current}/${selectedRef.current.id}?limit=100`)
            .then((history) => {
              setMessages((previous) => {
                const merged = new Map(previous.map((message) => [message.id, message]));
                history.forEach((message) => merged.set(message.id, message));
                return [...merged.values()].sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
              });
            })
            .catch((error) => console.warn('[BYTALK message] reconnect history refresh failed', error.message));
        }
        const connection = peerRef.current?.connection;
        if (callRef.current?.id && connection?.connectionState === 'connected') {
          socket.emit('call:connected', { callId: callRef.current.id });
        }
      });
      socket.on('connect_error', (error) => {
        console.warn('[BYTALK socket] connection error', error.message);
        if (active) setChatError(error.message || 'Could not connect to messaging.');
        if (active) setCallNotice(`Call service unavailable: ${error.message || 'connection failed'}`);
      });
      socket.on('disconnect', (reason) => {
        console.warn('[BYTALK socket] disconnected', { reason });
      });
      socket.on('error', (error) => {
        console.warn('[BYTALK socket] error', error?.message || 'unknown error');
      });
      socket.on('message:new', (message) => {
        try {
          const currentUserId = userIdRef.current;
          const recipientId = String(message.to || '');
          const senderId = String(message.from || '');
          if (recipientId !== String(currentUserId || '') || senderId === String(currentUserId || '')) return;
          if (seenMessageIdsRef.current.has(message.id)) return;
          seenMessageIdsRef.current.add(message.id);
          const openConversation = screenRef.current === 'chat' && String(selectedRef.current.id) === senderId;
          const sender = conversationForMessage(message);
          console.log('[BYTALK message] received', { messageId: message.id, from: senderId, to: recipientId, openConversation });
          setMessages((previous) => previous.some((item) => item.id === message.id) ? previous : [...previous, message]);
          setConversations((previous) => [
            {
              user: sender,
              latestMessage: message,
              unreadCount: openConversation ? 0 : (previous.find((item) => item.user.id === senderId)?.unreadCount || 0) + 1,
            },
            ...previous.filter((item) => item.user.id !== senderId),
          ]);
          if (!openConversation) {
            setUnreadByUser((previous) => ({ ...previous, [senderId]: (previous[senderId] || 0) + 1 }));
            setMessageBanner({ ...message, sender });
            notifyIncomingMessage(message);
          } else {
            request(`messages/${currentUserId}/${senderId}?limit=100`)
              .catch((error) => console.warn('[BYTALK message] read update failed', error.message));
            refreshConversations();
          }
        } catch (error) {
          console.warn('[BYTALK message] listener failed', error?.message || 'invalid message event');
        }
      });
      socket.on('message:status', (status) => {
        setMessages((previous) => previous.map((message) => message.id === status.id ? { ...message, ...status } : message));
        refreshConversations();
      });
      socket.on('presence:update', ({ userId: changedId, online }) => {
        console.log('[BYTALK presence] update', { userId: changedId, online });
        setPartners((previous) => previous.map((partner) => partner.id === changedId ? { ...partner, online } : partner));
        setSelected((previous) => previous.id === changedId ? { ...previous, online } : previous);
      });
      socket.on('presence:state', (onlineUserIds) => {
        const online = new Set((onlineUserIds || []).map(String));
        console.log('[BYTALK presence] snapshot', { count: online.size });
        setPartners((previous) => previous.map((partner) => ({ ...partner, online: online.has(String(partner.id)) })));
        setSelected((previous) => previous.id ? { ...previous, online: online.has(String(previous.id)) } : previous);
      });
      socket.on('typing:update', ({ from, typing: isTyping }) => {
        if (from === selectedRef.current.id) setTyping(Boolean(isTyping));
      });
      socket.on('call:incoming', (incoming) => {
        console.log('[BYTALK call] incoming call received', { callId: incoming.callId, type: incoming.type });
        if (callRef.current?.id === incoming.callId) return;
        const peer = partnersRef.current.find((partner) => partner.id === incoming.caller.id) || incoming.caller;
        setSelected(peer);
        updateCall({
          id: incoming.callId,
          peer,
          type: incoming.type,
          direction: 'incoming',
          status: 'Ringing',
          restricted: Boolean(incoming.restricted),
        });
        setCallNotice(incoming.restrictionReason || '');
        setScreen('call');
        notifyIncomingCall(incoming);
      });
      socket.on('call:accepted', ({ callId }) => {
        console.log('[BYTALK call] call accepted', { callId, userId });
        if (callRef.current?.id === callId) createCallOffer(callId);
      });
      socket.on('call:signal', (signal) => handleCallSignal(signal));
      socket.on('call:state', ({ callId, status, connectedAt }) => {
        if (callRef.current?.id !== callId) return;
        const connection = peerRef.current?.connection;
        const locallyConnected = connection?.connectionState === 'connected'
          || connection?.iceConnectionState === 'connected'
          || connection?.iceConnectionState === 'completed';
        console.log('[BYTALK call] server call state', { callId, status, locallyConnected });
        if (status === 'connected' && !locallyConnected) return;
        const title = status === 'connected' ? 'Connected' : 'Reconnecting';
        updateCall((previous) => previous ? { ...previous, status: title, connectedAt: connectedAt || previous.connectedAt } : previous);
      });
      socket.on('call:missed', ({ callId }) => {
        if (callRef.current?.id === callId) finishCallLocally('Missed', 'This call was not answered.');
      });
      socket.on('call:rejected', ({ callId }) => {
        if (callRef.current?.id === callId) finishCallLocally('Ended', 'The call was declined.');
      });
      socket.on('call:ended', ({ callId, status, reason }) => {
        console.log('[BYTALK call] call ended', { callId, status, reason });
        if (callRef.current?.id !== callId) return;
        const message = reason === 'disconnected'
          ? 'The other user disconnected.'
          : reason === 'connection-timeout'
            ? 'The media connection could not be established.'
            : '';
        finishCallLocally(status === 'missed' ? 'Missed' : 'Ended', message);
      });
      socket.connect();
    }

    connectSocket().catch((error) => {
      if (active) setChatError(error.message || 'Could not connect to messaging.');
    });
    return () => {
      active = false;
      if (socketRef.current === socket) socketRef.current = null;
      socket?.disconnect();
    };
  }, [sessionChecking, sessionVersion, userId]);

  useEffect(() => {
    if (!sessionChecking && screen === 'discover') loadDiscoverUsers();
  }, [screen, sessionChecking, sessionVersion, userId]);

  useEffect(() => {
    if (!sessionChecking && screen === 'practice') {
      setPartners([]);
      setPartnerTotalEligible(0);
      loadDiscoverUsers(false, practiceTopic.id);
    }
  }, [screen, sessionChecking, sessionVersion, userId, practiceTopic.id]);

  useEffect(() => {
    if (sessionChecking || screen !== 'dashboard' || !activeAuthToken) return undefined;
    let active = true;
    request('auth/me').then((result) => {
      if (!active || !result?.user) return;
      setPracticeInterests(Array.isArray(result.user.practiceInterests) ? result.user.practiceInterests : []);
    }).catch((error) => console.warn('[BYTALK profile] refresh failed', error.message));
    return () => {
      active = false;
    };
  }, [screen, sessionChecking, sessionVersion]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    authStorage.getItem(`bytalk_practice_progress_${userId}`).then((value) => {
      if (active && value) setPracticeProgress(Math.min(100, Number(value) || 0));
    }).catch((error) => console.warn('[BYTALK practice] progress could not be loaded', error.message));
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (screen === 'chat') {
      if (selected.id) {
        setUnreadByUser((previous) => {
          if (!previous[selected.id]) return previous;
          const next = { ...previous };
          delete next[selected.id];
          return next;
        });
        refreshConversations();
      }
      let active = true;
      setMessageLoading(true);
      setChatError('');
      setTyping(false);
      request(`messages/${userId}/${selected.id}`)
        .then((history) => {
          if (active) {
            setMessages((previous) => {
              const merged = new Map(previous.map((message) => [message.id, message]));
              history.forEach((message) => merged.set(message.id, message));
              return [...merged.values()].sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
            });
            setHasOlderMessages(history.length === 100);
            setTyping(false);
            refreshConversations();
          }
        })
        .catch((error) => {
          if (active) setChatError(error.message || 'Could not load this conversation.');
        })
        .finally(() => {
          if (active) setMessageLoading(false);
        });
      return () => {
        active = false;
      };
    }
    return undefined;
  }, [selected, screen, userId]);

  useEffect(() => {
    if (screen === 'dashboard' && activeAuthToken) {
      setCallHistoryError('');
      request('calls').then(setCallHistory).catch((error) => {
        setCallHistoryError(error.message || 'Could not load call history.');
      });
      setConversations((previous) => previous.map((conversation) =>
        conversation.user.id === selected.id ? { ...conversation, unreadCount: 0 } : conversation
      ));
    }
  }, [screen, sessionVersion]);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (callExitTimerRef.current) clearTimeout(callExitTimerRef.current);
    peerRef.current?.connection?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    stopAudioRoute();
  }, []);

  useEffect(() => {
    if (call?.status !== 'Connected' || !call.connectedAt) {
      setCallDuration(0);
      return undefined;
    }
    const updateDuration = () => setCallDuration(Math.max(0, Math.floor((Date.now() - Date.parse(call.connectedAt)) / 1000)));
    updateDuration();
    const timer = setInterval(updateDuration, 1000);
    return () => clearInterval(timer);
  }, [call?.status, call?.connectedAt]);

  // LOGIN HANDLER
  const handleLogin = async () => {
    setLoginError('');
    const emailTrimmed = loginEmail.trim();
    if (!emailTrimmed) {
      setLoginError('Email address is required.');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailTrimmed)) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Password is required.');
      return;
    }

    setAuthBusy(true);
    try {
      const res = await request('login', {
        method: 'POST',
        body: JSON.stringify({ email: emailTrimmed.toLowerCase(), password: loginPassword }),
      });

      if (res && res.token && res.user) {
        await saveSession(res, res.user.name || '');
        setSessionVersion((value) => value + 1);
        if (res.user.id) setUserId(res.user.id);
        if (res.user.name) setName(res.user.name);
        if (res.user.country) setCountry(res.user.country);
        if (res.user.nativeLanguage) setNativeLanguage(res.user.nativeLanguage);
        if (res.user.learningLanguage) setLearningLanguage(res.user.learningLanguage);
        if (res.user.level) setLevel(res.user.level);
        setPracticeInterests(Array.isArray(res.user.practiceInterests) ? res.user.practiceInterests : []);
        setLoginPassword('');
        setBackendUp(true);
        setScreen('discover');
      } else {
        setLoginError('Authentication failed: Server did not return a valid session token.');
      }
    } catch (err) {
      if (err.isNetworkError) {
        setLoginError(err.message);
      } else if (err.status === 404) {
        setLoginError('Server error: Login endpoint (/api/login) is not implemented on the backend.');
      } else if (err.status === 401) {
        setLoginError('Incorrect email or password.');
      } else if (err.status >= 500) {
        setLoginError('The authentication service is unavailable. Please try again.');
      } else {
        setLoginError(err.message || 'Unable to sign in. Please verify credentials.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  // REGISTRATION HANDLER (Auto sign-in per Requirement 10)
  const handleRegister = async () => {
    setRegError('');
    const nameTrimmed = regName.trim();
    const emailTrimmed = regEmail.trim();
    if (!nameTrimmed) {
      setRegError('Full name is required.');
      return;
    }
    if (!emailTrimmed) {
      setRegError('Email address is required.');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailTrimmed)) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (!regPassword) {
      setRegError('Password is required.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters long.');
      return;
    }
    if (!regConfirmPassword) {
      setRegError('Please confirm your password.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    setAuthBusy(true);
    try {
      const res = await request('register', {
        method: 'POST',
        body: JSON.stringify({
          name: nameTrimmed,
          email: emailTrimmed.toLowerCase(),
          password: regPassword,
        }),
      });

      if (res && res.token && res.user) {
        // Automatically save session and sign in for 15 days
        await saveSession(res, nameTrimmed);
        setSessionVersion((value) => value + 1);
        if (res.user.id) setUserId(res.user.id);
        setName(nameTrimmed);
        setRegPassword('');
        setRegConfirmPassword('');
        setBackendUp(true);
        // Navigate forward to Onboarding / Profile setup
        setScreen('onboard');
      } else {
        setRegError('Registration failed: Server did not confirm registration.');
      }
    } catch (err) {
      if (err.isNetworkError) {
        setRegError(err.message);
      } else if (err.status === 404) {
        setRegError('Server error: Registration endpoint (/api/register) is not implemented on the backend.');
      } else {
        setRegError(err.message || 'Unable to register. Please try again.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  // LOGOUT HANDLER (Requirement 9)
  const handleLogout = async () => {
    leaveRoom();
    socketRef.current?.disconnect();
    await clearSession();
    setSessionVersion((value) => value + 1);
    setUserId(null);
    setName('');
    setCountry('');
    setNativeLanguage('');
    setLearningLanguage('English');
    setLevel('Beginner');
    setPracticeInterests([]);
    setPartners([]);
    setMessages([]);
    setUnreadByUser({});
    setScreen('welcome');
  };

  async function saveProfile(next) {
    if (!name.trim() || !nativeLanguage || !learningLanguage || !country) {
      Alert.alert('Complete your profile', 'Choose your native language, learning language, and country before continuing.');
      return;
    }
    setBusy(true);
    try {
      await request('onboard', {
        method: 'POST',
        body: JSON.stringify({ name, country, nativeLanguage, learningLanguage, level, practiceInterests }),
      });
      setBackendUp(true);
    } catch (error) {
      Alert.alert('Profile not saved', error.message || 'Backend not reachable. Please try again.');
      setBusy(false);
      return;
    }

    setBusy(false);
    setScreen(next);
  }

  async function savePracticeInterests() {
    setPracticeInterestsSaving(true);
    try {
      const updated = await request('profile/practice-interests', {
        method: 'PATCH',
        body: JSON.stringify({ practiceInterests }),
      });
      setPracticeInterests(Array.isArray(updated.practiceInterests) ? updated.practiceInterests : []);
      Alert.alert('Interests saved', 'Your practice partner results will use these interests.');
      if (screen === 'practice') loadDiscoverUsers(true, practiceTopic.id);
    } catch (error) {
      Alert.alert('Interests not saved', error.message || 'Could not update your practice interests.');
    } finally {
      setPracticeInterestsSaving(false);
    }
  }

  async function send() {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    try {
      const result = await request('messages', {
        method: 'POST',
        body: JSON.stringify({ to: selected.id, text }),
      });
      setMessages((prev) => (prev.some((x) => x.id === result.id) ? prev : [...prev, result]));
      setConversations((previous) => {
        const partner = partnersRef.current.find((item) => item.id === result.to) || selected;
        const entry = { user: partner, latestMessage: result, unreadCount: 0 };
        return [entry, ...previous.filter((item) => item.user.id !== result.to)];
      });
      setChatError('');
      socketRef.current?.emit('typing:stop', { to: selected.id });
    } catch (error) {
      setChatError(error.message || 'Message could not be sent. Check your connection and try again.');
      setDraft(text);
    }
  }

  async function loadEarlierMessages() {
    const conversation = messages
      .filter((message) => (message.from === selected.id && message.to === userId) || (message.from === userId && message.to === selected.id))
      .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
    const oldest = conversation[0];
    if (!oldest || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const history = await request(`messages/${userId}/${selected.id}?limit=100&before=${encodeURIComponent(oldest.at)}`);
      setMessages((previous) => {
        const merged = new Map(previous.map((message) => [message.id, message]));
        history.forEach((message) => merged.set(message.id, message));
        return [...merged.values()].sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
      });
      setHasOlderMessages(history.length === 100);
    } catch (error) {
      setChatError(error.message || 'Could not load earlier messages.');
    } finally {
      setLoadingOlderMessages(false);
    }
  }

  function updateDraft(text) {
    setDraft(text);
    const socket = socketRef.current;
    if (!socket?.connected) return;
    if (!text.trim()) {
      socket.emit('typing:stop', { to: selected.id });
      return;
    }
    socket.emit('typing:start', { to: selected.id });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', { to: selected.id });
    }, 1400);
  }

  async function addWord() {
    if (!word.trim()) return;
    try {
      const x = await request('vocabulary', {
        method: 'POST',
        body: JSON.stringify({ userId, word, category: 'Conversation' }),
      });
      setVocab((v) => [...v, x]);
      setWord('');
    } catch {
      Alert.alert('Connection required', 'Start backend first.');
    }
  }

  function startPractice(topic = practiceTopic) {
    setPracticeTopic(topic);
    setPracticeAnswer('');
    setPracticeStep('exercise');
    setScreen('practiceSession');
  }

  async function completePractice() {
    const nextProgress = Math.min(100, practiceProgress + 20);
    setPracticeProgress(nextProgress);
    setPracticeStep('complete');
    try {
      await authStorage.setItem(`bytalk_practice_progress_${userId}`, String(nextProgress));
    } catch (error) {
      console.warn('[BYTALK practice] progress could not be saved', error.message);
    }
  }

  function openPractice() {
    setPracticeStep('overview');
    setScreen('practice');
  }

  const tabItems = [
    ['discover', 'compass', 'Discover'],
    ['practice', 'book-outline', 'Practice'],
    ['chat', 'chatbubbles', 'Messages'],
    ['dashboard', 'bar-chart', 'Profile'],
  ];
  const filteredPartners = partners.filter((partner) =>
    [partner.displayName, partner.name, partner.country, partner.nativeLanguage, partner.learningLanguage, partner.level]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const practicePartners = partners;

  const Header = ({ title, subtitle, onBack }) => (
    <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 14 }}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="arrow-back" size={20} color={navy} />
          <Txt size={14} color={muted} style={{ marginLeft: 6 }}>Back</Txt>
        </TouchableOpacity>
      )}
      <Txt size={26} bold>{title}</Txt>
      {subtitle && <Txt color={muted} style={{ marginTop: 5 }}>{subtitle}</Txt>}
    </View>
  );

  const Field = ({ label, value, setValue, placeholder }) => (
    <View style={{ marginBottom: 15 }}>
      <Txt size={13} bold style={{ marginBottom: 8 }}>{label}</Txt>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={{
          backgroundColor: '#fff',
          borderColor: border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 15,
          color: navy,
          fontSize: 15,
        }}
      />
    </View>
  );

  if (sessionChecking) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 38, fontWeight: '900', color: COLORS.primary, marginBottom: 14 }}>BT</Text>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Txt color={COLORS.textSecondary} size={13} style={{ marginTop: 12 }}>Restoring session...</Txt>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.webShell}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Top brand header */}
          {!['welcome', 'login', 'register'].includes(screen) && (
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => setScreen('welcome')} style={styles.logoRowSmall}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.primary, marginRight: 6 }}>BT</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: navy }}>
                  BY<Text style={{ color: orange }}>TALK</Text>
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 6, backgroundColor: backendUp ? '#168653' : '#F0B64A' }} />
                  <Txt size={11} color={muted}>{backendUp ? 'API Online' : 'API Offline'}</Txt>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.topLogoutButton} activeOpacity={0.7}>
                  <Ionicons name="log-out-outline" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {messageBanner && (
            <TouchableOpacity
              onPress={() => openConversation(messageBanner.sender)}
              style={{ marginHorizontal: 14, marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFF0E8', borderWidth: 1, borderColor: '#FFD4C2' }}
            >
              <Txt size={12} color={navy} bold>{messageBanner.sender.displayName || messageBanner.sender.name}: <Txt size={12} color={navy} bold={false}>{messageBanner.text}</Txt></Txt>
            </TouchableOpacity>
          )}

          {/* SCREEN 1: WELCOME SCREEN */}
          {screen === 'welcome' && (
            <ScrollView
              contentContainerStyle={[
                styles.welcomeScrollContainer,
                isShortViewport && { justifyContent: 'flex-start' },
              ]}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Brand Header */}
              <View style={styles.welcomeHeader}>
                <View style={styles.brandRow}>
                  <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="chatbubble-ellipses" size={34} color={COLORS.primary} />
                  </View>
                  <Text style={styles.brandTitle}>
                    BY<Text style={{ color: COLORS.primary }}>TALK</Text>
                  </Text>
                </View>
                <Text style={styles.brandSubtitle}>Talk  •  Learn  •  Connect</Text>
              </View>

              {/* Hero Headlines */}
              <View style={styles.heroTextSection}>
                <Text style={styles.heroMainTitle}>Find Your{'\n'}Language Partner</Text>
                <Text style={styles.heroSubText}>
                  Make global friends, practice languages{'\n'}and explore new cultures.
                </Text>
              </View>

              {/* Hero Illustration */}
              <View
                style={[
                  styles.heroIllustrationContainer,
                  {
                    flexGrow: isShortViewport ? 0 : 1,
                    height: isShortViewport ? welcomeIllustrationHeight : undefined,
                    minHeight: isShortViewport ? welcomeIllustrationHeight : 230,
                    maxHeight: Math.min(420, viewportHeight * 0.48),
                  },
                ]}
              >
                <Image
                  source={welcomeImage}
                  style={styles.heroIllustrationImage}
                  resizeMode="contain"
                  accessibilityLabel="BYTALK language partner welcome illustration"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.welcomeFooter}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.primaryButtonShadow}
                  onPress={() => setScreen('login')}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradientButton}
                  >
                    <Text style={styles.primaryButtonText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.footerLinkRow}>
                  <Text style={styles.footerLabel}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => setScreen('login')} activeOpacity={0.7}>
                    <Text style={styles.footerLinkBold}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          {/* SCREEN 2: LOGIN SCREEN */}
          {screen === 'login' && (
            <ScrollView
              contentContainerStyle={styles.authScrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Top Navigation Bar with Back Button and Health status */}
              <View style={styles.authTopNav}>
                <TouchableOpacity
                  onPress={() => {
                    setLoginError('');
                    setScreen('welcome');
                  }}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <View style={styles.healthBadge}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: backendUp ? '#168653' : '#F0B64A' }} />
                  <Txt size={11} color={muted}>{backendUp ? 'API Online' : 'API Offline'}</Txt>
                </View>
              </View>

              {/* Centered Brand Header */}
              <View style={styles.authBrandHeader}>
                <View style={styles.authBrandRow}>
                  <Ionicons name="chatbubble-ellipses" size={36} color={COLORS.primary} />
                  <Text style={styles.authBrandTitle}>
                    BY<Text style={{ color: COLORS.primary }}>TALK</Text>
                  </Text>
                </View>
                <Text style={styles.authBrandSubtitle}>Talk  •  Learn  •  Connect</Text>
              </View>

              {/* Title & Subtitle */}
              <View style={styles.authHeadingBlock}>
                <Text style={styles.authHeadingTitle}>Welcome Back</Text>
                <Text style={styles.authHeadingSubtitle}>Sign in to continue your language journey</Text>
              </View>

              {/* Server or Validation Error Alert */}
              {loginError ? (
                <View style={styles.errorAlertContainer}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.error} style={{ marginRight: 8 }} />
                  <Text style={styles.errorAlertText}>{loginError}</Text>
                </View>
              ) : null}

              {/* Form Fields */}
              <View style={styles.authForm}>
                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View
                    style={[
                      styles.inputFieldBox,
                      focusedField === 'loginEmail' && styles.inputFieldBoxFocused,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={focusedField === 'loginEmail' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <TextInput
                      value={loginEmail}
                      onChangeText={(val) => {
                        setLoginEmail(val);
                        if (loginError) setLoginError('');
                      }}
                      onFocus={() => setFocusedField('loginEmail')}
                      onBlur={() => setFocusedField('')}
                      placeholder="name@example.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.authInput}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View
                    style={[
                      styles.inputFieldBox,
                      focusedField === 'loginPassword' && styles.inputFieldBoxFocused,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedField === 'loginPassword' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <TextInput
                      value={loginPassword}
                      onChangeText={(val) => {
                        setLoginPassword(val);
                        if (loginError) setLoginError('');
                      }}
                      onFocus={() => setFocusedField('loginPassword')}
                      onBlur={() => setFocusedField('')}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showLoginPassword}
                      autoCapitalize="none"
                      style={styles.authInput}
                    />
                    <TouchableOpacity
                      onPress={() => setShowLoginPassword(!showLoginPassword)}
                      activeOpacity={0.7}
                      style={styles.passwordToggle}
                    >
                      <Ionicons
                        name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Forgot Password Action */}
                <View style={styles.forgotPasswordRow}>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Forgot Password', 'Password reset instructions will be sent to your email.')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Full-Width Orange Sign In Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[styles.primaryButtonShadow, { marginTop: 8 }]}
                  onPress={handleLogin}
                  disabled={authBusy}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradientButton}
                  >
                    {authBusy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Bottom Link to Registration */}
              <View style={[styles.footerLinkRow, styles.authFooterLinkRow]}>
                <Text style={styles.footerLabel}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => {
                    setLoginError('');
                    setScreen('register');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.footerLinkBold}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* SCREEN 3: REGISTRATION SCREEN */}
          {screen === 'register' && (
            <ScrollView
              contentContainerStyle={styles.authScrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Top Navigation Bar with Back Button and Health status */}
              <View style={styles.authTopNav}>
                <TouchableOpacity
                  onPress={() => {
                    setRegError('');
                    setScreen('login');
                  }}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <View style={styles.healthBadge}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: backendUp ? '#168653' : '#F0B64A' }} />
                  <Txt size={11} color={muted}>{backendUp ? 'API Online' : 'API Offline'}</Txt>
                </View>
              </View>

              {/* Centered Brand Header */}
              <View style={styles.authBrandHeader}>
                <View style={styles.authBrandRow}>
                  <Ionicons name="chatbubble-ellipses" size={36} color={COLORS.primary} />
                  <Text style={styles.authBrandTitle}>
                    BY<Text style={{ color: COLORS.primary }}>TALK</Text>
                  </Text>
                </View>
                <Text style={styles.authBrandSubtitle}>Talk  •  Learn  •  Connect</Text>
              </View>

              {/* Title & Subtitle */}
              <View style={styles.authHeadingBlock}>
                <Text style={styles.authHeadingTitle}>Create Account</Text>
                <Text style={styles.authHeadingSubtitle}>Start your language learning journey</Text>
              </View>

              {/* Server or Validation Error Alert */}
              {regError ? (
                <View style={styles.errorAlertContainer}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.error} style={{ marginRight: 8 }} />
                  <Text style={styles.errorAlertText}>{regError}</Text>
                </View>
              ) : null}

              {/* Form Fields */}
              <View style={styles.authForm}>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View
                    style={[
                      styles.inputFieldBox,
                      focusedField === 'regName' && styles.inputFieldBoxFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={focusedField === 'regName' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <TextInput
                      value={regName}
                      onChangeText={(val) => {
                        setRegName(val);
                        if (regError) setRegError('');
                      }}
                      onFocus={() => setFocusedField('regName')}
                      onBlur={() => setFocusedField('')}
                      placeholder="e.g. Alex Smith"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      style={styles.authInput}
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View
                    style={[
                      styles.inputFieldBox,
                      focusedField === 'regEmail' && styles.inputFieldBoxFocused,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={focusedField === 'regEmail' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <TextInput
                      value={regEmail}
                      onChangeText={(val) => {
                        setRegEmail(val);
                        if (regError) setRegError('');
                      }}
                      onFocus={() => setFocusedField('regEmail')}
                      onBlur={() => setFocusedField('')}
                      placeholder="name@example.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.authInput}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View
                    style={[
                      styles.inputFieldBox,
                      focusedField === 'regPassword' && styles.inputFieldBoxFocused,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedField === 'regPassword' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <TextInput
                      value={regPassword}
                      onChangeText={(val) => {
                        setRegPassword(val);
                        if (regError) setRegError('');
                      }}
                      onFocus={() => setFocusedField('regPassword')}
                      onBlur={() => setFocusedField('')}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showRegPassword}
                      autoCapitalize="none"
                      style={styles.authInput}
                    />
                    <TouchableOpacity
                      onPress={() => setShowRegPassword(!showRegPassword)}
                      activeOpacity={0.7}
                      style={styles.passwordToggle}
                    >
                      <Ionicons
                        name={showRegPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View
                    style={[
                      styles.inputFieldBox,
                      focusedField === 'regConfirmPassword' && styles.inputFieldBoxFocused,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedField === 'regConfirmPassword' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <TextInput
                      value={regConfirmPassword}
                      onChangeText={(val) => {
                        setRegConfirmPassword(val);
                        if (regError) setRegError('');
                      }}
                      onFocus={() => setFocusedField('regConfirmPassword')}
                      onBlur={() => setFocusedField('')}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showRegConfirmPassword}
                      autoCapitalize="none"
                      style={styles.authInput}
                    />
                    <TouchableOpacity
                      onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      activeOpacity={0.7}
                      style={styles.passwordToggle}
                    >
                      <Ionicons
                        name={showRegConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Full-Width Orange Sign Up Button */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[styles.primaryButtonShadow, { marginTop: 12 }]}
                  onPress={handleRegister}
                  disabled={authBusy}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradientButton}
                  >
                    {authBusy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Sign Up</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Bottom Link to Login */}
              <View style={[styles.footerLinkRow, styles.authFooterLinkRow]}>
                <Text style={styles.footerLabel}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => {
                    setRegError('');
                    setScreen('login');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.footerLinkBold}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* SCREEN 4: ONBOARDING PROFILE SETUP */}
          {screen === 'onboard' && (
            <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <TouchableOpacity onPress={() => setScreen('login')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <Ionicons name="arrow-back" size={20} color={navy} />
                <Txt size={14} color={muted} style={{ marginLeft: 6 }}>Back to Login</Txt>
              </TouchableOpacity>
              <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                <Txt size={26} bold style={{ textAlign: 'center' }}>Your language{'\n'}journey starts here</Txt>
                <Txt color={muted} style={{ textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
                  Tell us about yourself to match you with native speakers worldwide.
                </Txt>
              </View>
              <Field label="Your name" value={name} setValue={setName} placeholder="e.g. Alex Smith" />
              <SearchSelect
                label="My native language"
                value={nativeLanguage}
                options={LANGUAGES}
                onSelect={setNativeLanguage}
                placeholder="Choose a language"
              />
              <SearchSelect
                label="I want to learn"
                value={learningLanguage}
                options={LANGUAGES}
                onSelect={setLearningLanguage}
                placeholder="Choose a language"
              />
              <SearchSelect
                label="I am from"
                value={country}
                options={COUNTRY_OPTIONS}
                onSelect={setCountry}
                placeholder="Choose a country"
              />
              <Btn label="Next  →" onPress={() => setScreen('level')} style={{ marginTop: 15 }} />
            </ScrollView>
          )}

          {/* SCREEN 5: PROFICIENCY LEVEL */}
          {screen === 'level' && (
            <ScrollView contentContainerStyle={{ padding: 22 }} keyboardShouldPersistTaps="handled">
              <Header
                title="Choose your level"
                subtitle="Select your current proficiency so we can find the best partners for you."
                onBack={() => setScreen('onboard')}
              />
              {[
                ['🌱', 'Beginner', 'I know a few basic words and phrases.'],
                ['🍃', 'Elementary', 'I can have simple conversations.'],
                ['📊', 'Intermediate', 'I can communicate in daily situations.'],
                ['📘', 'Upper Intermediate', 'I can discuss familiar topics with confidence.'],
                ['🎓', 'Advanced', 'I can express myself fluently.'],
                ['👑', 'Proficient', 'I can communicate like a native.'],
              ].map(([emoji, n, desc]) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setLevel(n)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 15,
                    marginBottom: 11,
                    borderWidth: 1.5,
                    borderColor: level === n ? orange : border,
                    borderRadius: 14,
                    backgroundColor: level === n ? COLORS.softSurface : '#fff',
                  }}
                >
                  <Txt size={28}>{emoji}</Txt>
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Txt bold size={15}>{n}</Txt>
                    <Txt size={12} color={muted} style={{ marginTop: 2 }}>{desc}</Txt>
                  </View>
                  <Ionicons
                    name={level === n ? 'radio-button-on' : 'radio-button-off'}
                    color={level === n ? orange : '#aab3c0'}
                    size={22}
                  />
                </TouchableOpacity>
              ))}
              <Btn label={busy ? 'Saving...' : 'Continue  →'} onPress={() => saveProfile('discover')} style={{ marginTop: 8 }} />
            </ScrollView>
          )}

          {/* SCREEN 6: DISCOVER PARTNERS */}
          {screen === 'discover' && (
            <>
              <Header title="Find your partner" subtitle="Meet people from around the world and practice together." />
              <View style={styles.searchBar}>
                <Ionicons name="search" size={19} color={muted} />
                <TextInput
                  placeholder="Search by name, country, language..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                  style={{ flex: 1, padding: 12, color: navy, fontSize: 14 }}
                />
              </View>
              <View style={{ paddingHorizontal: 22, paddingTop: 12 }}>
                <Btn
                  label={subscription?.plan?.id === 'plus' || subscription?.plan?.id === 'pro' ? 'Manage BYTALK Premium' : 'Unlock video-call practice'}
                  outline
                  onPress={openSubscription}
                />
              </View>
              <ScrollView
                contentContainerStyle={{ padding: 22, flexGrow: 1 }}
                refreshControl={
                  <RefreshControl
                    refreshing={discoverRefreshing}
                    onRefresh={() => loadDiscoverUsers(true)}
                    tintColor={orange}
                    colors={[orange]}
                  />
                }
              >
                {discoverError ? (
                  <View style={styles.discoverMessage}>
                    <Txt color={COLORS.error} size={13} style={{ textAlign: 'center' }}>{discoverError}</Txt>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Retry loading registered users"
                      onPress={() => loadDiscoverUsers(true)}
                      style={styles.discoverRetry}
                    >
                      <Ionicons name="refresh" size={16} color={orange} />
                      <Txt color={orange} size={13} bold>Retry</Txt>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {discoverLoading && partners.length === 0 ? (
                  <View style={styles.discoverMessage}>
                    <ActivityIndicator color={orange} />
                    <Txt size={13} color={muted} style={{ marginTop: 10 }}>Finding registered users…</Txt>
                  </View>
                ) : null}
                {!discoverLoading && !discoverError && partners.length === 0 ? (
                  <View style={styles.discoverMessage}>
                    <Ionicons name="people-outline" size={34} color={muted} />
                    <Txt size={14} color={muted} style={{ marginTop: 10, textAlign: 'center' }}>
                      No other registered users yet. Pull down to refresh.
                    </Txt>
                  </View>
                ) : null}
                {!discoverLoading && !discoverError && partners.length > 0 && filteredPartners.length === 0 ? (
                  <View style={styles.discoverMessage}>
                    <Txt size={14} color={muted} style={{ textAlign: 'center' }}>No users match “{search}”. Try a different search.</Txt>
                  </View>
                ) : null}
                {filteredPartners.map((p) => (
                    <View key={p.id} style={styles.partnerCard}>
                      <View style={styles.partnerInfoRow}>
                        <View style={[styles.avatarCircle, { backgroundColor: '#FFE0D3' }]}>
                          {p.avatarUrl ? (
                            <Image
                              source={{ uri: p.avatarUrl }}
                              accessibilityLabel={`${p.displayName || p.name} profile photo`}
                              style={styles.partnerAvatarImage}
                            />
                          ) : (
                            <Txt size={20} bold color={orange}>{(p.displayName || p.name || '?').trim().charAt(0).toUpperCase()}</Txt>
                          )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Txt bold size={15}>
                            {p.displayName || p.name}  <Txt size={12} color={muted}>{p.country}</Txt>
                          </Txt>
                          <Txt size={11} color={muted} style={{ marginTop: 2 }}>
                            Speaks: {p.nativeLanguage}, {p.learningLanguage}
                          </Txt>
                          <Txt size={11} color={COLORS.primary} style={{ marginTop: 2, fontWeight: '600' }}>
                            {p.level}  ·  {p.learningLanguage}
                          </Txt>
                          <Txt size={10} color={p.online ? COLORS.success : muted} style={{ marginTop: 3 }}>
                            {p.online ? '● Online' : '● Offline'}
                          </Txt>
                        </View>
                      </View>
                      <View style={styles.partnerActions}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Chat with ${p.name}`}
                          onPress={() => {
                            openConversation(p);
                          }}
                          style={[styles.chatButtonOutline, styles.partnerAction]}
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={17} color={orange} />
                          <Txt color={orange} size={12} bold>Start chat</Txt>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Voice call ${p.name}`}
                          onPress={() => startCall(p, 'audio')}
                          disabled={Boolean(callStarting)}
                          style={styles.partnerAction}
                        >
                          {callStarting?.partnerId === p.id && callStarting.type === 'audio' ? (
                            <ActivityIndicator size="small" color={orange} />
                          ) : (
                            <>
                              <Ionicons name="call-outline" size={17} color={orange} />
                              <Txt color={orange} size={12} bold>Voice</Txt>
                            </>
                          )}
                        </TouchableOpacity>
                        {hasVideoEntitlement() ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Video call ${p.name}`}
                            onPress={() => startCall(p, 'video')}
                            disabled={Boolean(callStarting)}
                            style={styles.partnerAction}
                          >
                            {callStarting?.partnerId === p.id && callStarting.type === 'video' ? (
                              <ActivityIndicator size="small" color={orange} />
                            ) : (
                              <>
                                <Ionicons name="videocam-outline" size={18} color={orange} />
                                <Txt color={orange} size={12} bold>Video</Txt>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))}
              </ScrollView>
            </>
          )}

          {screen === 'messages' && (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Header title="Messages" subtitle="Your latest conversations" />
              {!conversations.length ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Txt color={muted}>No conversations yet. Start a chat from Discover.</Txt>
                </View>
              ) : conversations.map((conversation) => {
                const partner = conversation.user;
                const latest = conversation.latestMessage;
                return (
                  <TouchableOpacity
                    key={partner.id}
                    onPress={() => openConversation(partner)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEF0F4' }}
                  >
                    <View style={[styles.avatarCircle, { backgroundColor: '#FFE0D3' }]}>
                      {partner.avatarUrl ? (
                        <Image source={{ uri: partner.avatarUrl }} style={styles.partnerAvatarImage} />
                      ) : (
                        <Txt size={19} bold color={orange}>{(partner.displayName || partner.name || '?').charAt(0).toUpperCase()}</Txt>
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Txt bold size={15}>{partner.displayName || partner.name}</Txt>
                        <Txt size={10} color={muted}>{latest?.at ? new Date(latest.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Txt>
                      </View>
                      <Txt size={12} color={muted} numberOfLines={1} style={{ marginTop: 4 }}>{latest?.text || ''}</Txt>
                    </View>
                    {conversation.unreadCount > 0 && (
                      <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                        <Txt color="#fff" size={10} bold>{conversation.unreadCount}</Txt>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* SCREEN 7: CHAT */}
          {screen === 'chat' && (
            <>
              <TouchableOpacity
                onPress={() => setScreen('messages')}
                style={styles.chatHeader}
              >
                <Ionicons name="arrow-back" size={22} color={navy} />
                <View>
                  <Txt size={17} bold>{selected.name}  <Txt size={12} color={selected.online ? '#18b576' : muted}>● {selected.online ? 'Online' : 'Offline'}</Txt></Txt>
                  <Txt size={11} color={muted}>{selected.country} · {selected.learningLanguage}</Txt>
                </View>
              </TouchableOpacity>
              {chatError ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Return to Discover"
                  onPress={() => setScreen('discover')}
                  style={{ padding: 12, backgroundColor: '#FFF1F0' }}
                >
                  <Txt color={COLORS.error} size={12}>{chatError}  Return to Discover and reopen this conversation to retry.</Txt>
                </TouchableOpacity>
              ) : null}
              {typing && (
                <Txt size={11} color={muted} style={{ paddingHorizontal: 18, paddingTop: 8 }}>{selected.name} is typing...</Txt>
              )}
              <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'flex-end' }}>
                {messageLoading && <ActivityIndicator color={orange} style={{ margin: 18 }} />}
                {!messageLoading && hasOlderMessages && (
                  <TouchableOpacity onPress={loadEarlierMessages} disabled={loadingOlderMessages} style={{ alignSelf: 'center', padding: 10 }}>
                    {loadingOlderMessages
                      ? <ActivityIndicator color={orange} />
                      : <Txt size={12} color={orange} bold>Load earlier messages</Txt>}
                  </TouchableOpacity>
                )}
                {!messageLoading && messages
                  .filter((m) => (m.from === selected.id && m.to === userId) || (m.from === userId && m.to === selected.id))
                  .map((m) => (
                    <View
                      key={m.id}
                      style={{
                        alignSelf: m.from === userId ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        marginBottom: 12,
                        backgroundColor: m.from === userId ? COLORS.softSurface : light,
                        borderColor: m.from === userId ? '#FFD8C9' : '#ECEFF3',
                        borderWidth: 1,
                        padding: 14,
                        borderRadius: 16,
                      }}
                    >
                      <Txt color={muted} size={10} style={{ marginBottom: 4 }}>{m.from === userId ? 'You' : selected.name}</Txt>
                      <Txt color={navy} size={14}>{m.text}</Txt>
                      <Txt color={muted} size={10} style={{ marginTop: 5, alignSelf: 'flex-end' }}>
                        {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {m.from === userId ? ` · ${m.readAt ? 'Read' : m.deliveredAt ? 'Delivered' : 'Sent'}` : ''}
                      </Txt>
                    </View>
                  ))}
              </ScrollView>
              <View style={styles.chatInputRow}>
                <TextInput
                  placeholder="Type a message..."
                  placeholderTextColor="#9CA3AF"
                  value={draft}
                  onChangeText={updateDraft}
                  style={styles.chatInput}
                />
                <TouchableOpacity onPress={send} style={styles.sendButton}>
                  <Ionicons name="send" color="#fff" size={18} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {screen === 'call' && call && (
            <View style={styles.callScreen}>
              <View style={styles.callHeader}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="End call and return"
                  onPress={endCall}
                  style={styles.callBackButton}
                >
                  <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Txt color="#FFFFFF" size={17} bold>{call.peer.name}</Txt>
                  <Txt color="#D8D8E2" size={12}>{call.type === 'video' ? 'Video call' : 'Voice call'}</Txt>
                </View>
                <Txt color="#D8D8E2" size={12}>
                  {call.status === 'Connected'
                    ? `${String(Math.floor(callDuration / 60)).padStart(2, '0')}:${String(callDuration % 60).padStart(2, '0')}`
                    : call.status}
                </Txt>
              </View>

              {call.type === 'video' ? (
                <View style={styles.callVideoStage}>
                  <CallVideo
                    stream={remoteStream}
                    label={call.status === 'Connected' ? 'Waiting for remote video…' : 'Connecting video…'}
                    style={styles.remoteVideo}
                  />
                  {localStream?.getVideoTracks().length > 0 ? (
                    <CallVideo
                      stream={localStream}
                      label="Camera off"
                      mirror
                      style={styles.localVideo}
                    />
                  ) : (
                    <View style={styles.localVideoFallback}>
                      <Txt color="#FFFFFF" size={10}>Camera unavailable</Txt>
                    </View>
                  )}
                  {call.status === 'Connected' && remoteStream && !remoteStream.getVideoTracks().length ? (
                    <View style={styles.videoFallbackNotice}>
                      <Txt color="#FFFFFF" size={12}>The other person has no camera available. Audio is still connected.</Txt>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.voiceCallAvatarArea}>
                  <CallAudio stream={remoteStream} />
                  <View style={styles.callAvatar}>
                    <Txt size={48} bold color="#FFFFFF">{call.peer.name?.charAt(0)?.toUpperCase() || '?'}</Txt>
                  </View>
                  <Txt color="#FFFFFF" size={22} bold style={{ marginTop: 16 }}>{call.peer.name}</Txt>
                </View>
              )}

              <View style={styles.callStatusArea}>
                <Txt color="#FFFFFF" size={15} bold>{call.status}</Txt>
                {callNotice ? <Txt color="#FFD4C8" size={12} style={{ textAlign: 'center', marginTop: 8 }}>{callNotice}</Txt> : null}
              </View>

              {call.direction === 'incoming' && call.status === 'Ringing' ? (
                <View style={styles.incomingCallActions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Decline incoming call"
                    onPress={rejectCall}
                    style={[styles.callControl, styles.declineControl]}
                  >
                    <Ionicons name="call" size={23} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                    <Txt color="#FFFFFF" size={11}>Decline</Txt>
                  </TouchableOpacity>
                  {call.restricted ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Upgrade to accept video call"
                      onPress={openSubscription}
                      style={[styles.callControl, styles.acceptControl]}
                    >
                      <Ionicons name="star" size={23} color="#FFFFFF" />
                      <Txt color="#FFFFFF" size={11}>Upgrade</Txt>
                    </TouchableOpacity>
                  ) : <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Accept incoming call"
                    onPress={acceptCall}
                    style={[styles.callControl, styles.acceptControl]}
                  >
                    <Ionicons name={call.type === 'video' ? 'videocam' : 'call'} size={23} color="#FFFFFF" />
                    <Txt color="#FFFFFF" size={11}>Accept</Txt>
                  </TouchableOpacity>}
                </View>
              ) : (
                <View style={styles.callControls}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'}
                    onPress={() => {
                      const nextMuted = !muted;
                      localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
                      setMuted(nextMuted);
                    }}
                    style={[styles.callControl, muted && styles.callControlActive]}
                  >
                    <Ionicons name={muted ? 'mic-off' : 'mic'} size={21} color="#FFFFFF" />
                    <Txt color="#FFFFFF" size={10}>{muted ? 'Unmute' : 'Mute'}</Txt>
                  </TouchableOpacity>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={speakerEnabled ? 'Use earpiece' : 'Use speaker'}
                      onPress={() => {
                        try {
                          const nextSpeaker = !speakerEnabled;
                          setAudioRoute(nextSpeaker);
                          setSpeakerEnabled(nextSpeaker);
                        } catch (error) {
                          setCallNotice(error.message || 'Speaker control is unavailable.');
                        }
                      }}
                      style={[styles.callControl, speakerEnabled && styles.callControlActive]}
                    >
                      <Ionicons name={speakerEnabled ? 'volume-high' : 'volume-medium'} size={21} color="#FFFFFF" />
                      <Txt color="#FFFFFF" size={10}>{speakerEnabled ? 'Speaker' : 'Earpiece'}</Txt>
                    </TouchableOpacity>
                  )}
                  {call.type === 'video' && (
                    <>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                        onPress={() => {
                          const nextEnabled = !cameraEnabled;
                          localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = nextEnabled; });
                          setCameraEnabled(nextEnabled);
                        }}
                        disabled={!localStream?.getVideoTracks().length}
                        style={[styles.callControl, !cameraEnabled && styles.callControlActive, !localStream?.getVideoTracks().length && { opacity: 0.45 }]}
                      >
                        <Ionicons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={21} color="#FFFFFF" />
                        <Txt color="#FFFFFF" size={10}>{cameraEnabled ? 'Camera' : 'Camera off'}</Txt>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Switch camera"
                        onPress={() => {
                          try {
                            switchCamera(localStreamRef.current, peerRef.current?.connection);
                          } catch (error) {
                            setCallNotice(error.message || 'Could not switch camera.');
                          }
                        }}
                        disabled={!localStream?.getVideoTracks().length}
                        style={[styles.callControl, !localStream?.getVideoTracks().length && { opacity: 0.45 }]}
                      >
                        <Ionicons name="camera-reverse-outline" size={21} color="#FFFFFF" />
                        <Txt color="#FFFFFF" size={10}>Flip</Txt>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="End call"
                    onPress={endCall}
                    style={[styles.callControl, styles.declineControl]}
                  >
                    <Ionicons name="call" size={21} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                    <Txt color="#FFFFFF" size={10}>End</Txt>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* SCREEN 8: LANGUAGE PRACTICE */}
          {screen === 'practice' && (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
              <Header title="Language Practice" subtitle={`Build confidence in ${learningLanguage || 'your learning language'} with short daily exercises.`} />
              <View style={styles.practiceProgressCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Txt size={16} bold>Daily Practice</Txt>
                    <Txt size={12} color={muted} style={{ marginTop: 4 }}>{practiceProgress}% complete today</Txt>
                  </View>
                  <Txt size={20} bold color={orange}>{practiceProgress}%</Txt>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${practiceProgress}%` }]} />
                </View>
                <Btn label="Start Practice" onPress={() => startPractice()} style={{ marginTop: 15 }} />
              </View>

              <Txt size={17} bold style={{ marginBottom: 12 }}>Choose a conversation topic</Txt>
              {PRACTICE_TOPICS.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Practice ${topic.title}`}
                  onPress={() => setPracticeTopic(topic)}
                  style={[styles.practiceTopicCard, practiceTopic.id === topic.id && styles.practiceTopicCardSelected]}
                >
                  <View style={styles.practiceTopicIcon}>
                    <Ionicons name={topic.icon} size={22} color={orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={15} bold>{topic.title}</Txt>
                    <Txt size={12} color={muted} style={{ marginTop: 3 }}>{topic.description}</Txt>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={muted} />
                </TouchableOpacity>
              ))}
              <Txt size={17} bold style={{ marginTop: 18, marginBottom: 10 }}>
                {practiceTopic.title} partners
              </Txt>
              {discoverError ? (
                <View style={styles.discoverMessage}>
                  <Txt color={COLORS.error} size={13} style={{ textAlign: 'center' }}>{discoverError}</Txt>
                  <TouchableOpacity onPress={() => loadDiscoverUsers(true, practiceTopic.id)} style={styles.discoverRetry}>
                    <Ionicons name="refresh" size={16} color={orange} />
                    <Txt color={orange} size={13} bold>Retry</Txt>
                  </TouchableOpacity>
                </View>
              ) : null}
              {discoverLoading ? (
                <View style={styles.discoverMessage}>
                  <ActivityIndicator color={orange} />
                  <Txt size={13} color={muted} style={{ marginTop: 10 }}>Finding registered partners…</Txt>
                </View>
              ) : null}
              {!discoverLoading && !discoverError && practicePartners.length === 0 ? (
                <View style={styles.discoverMessage}>
                  <Ionicons name="people-outline" size={34} color={muted} />
                  <Txt size={14} color={muted} style={{ marginTop: 10, textAlign: 'center' }}>
                    {partnerTotalEligible === 0
                      ? 'No partners have joined yet. Invite a friend to start practicing.'
                      : 'No partners found for this topic. Try All or another topic.'}
                  </Txt>
                </View>
              ) : null}
              {!discoverLoading && !discoverError && practicePartners.map((p) => (
                <View key={p.id} style={styles.partnerCard}>
                  <View style={styles.partnerInfoRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: '#FFE0D3' }]}>
                      {p.avatarUrl ? (
                        <Image source={{ uri: p.avatarUrl }} style={styles.partnerAvatarImage} />
                      ) : (
                        <Txt size={20} bold color={orange}>{(p.displayName || p.name || '?').trim().charAt(0).toUpperCase()}</Txt>
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Txt bold size={15}>{p.displayName || p.name}  <Txt size={12} color={muted}>{p.country}</Txt></Txt>
                      <Txt size={11} color={muted} style={{ marginTop: 2 }}>Speaks: {p.nativeLanguage}, {p.learningLanguage}</Txt>
                      <Txt size={11} color={COLORS.primary} style={{ marginTop: 2, fontWeight: '600' }}>{p.level} · {p.learningLanguage}</Txt>
                      <Txt size={10} color={p.online ? COLORS.success : muted} style={{ marginTop: 3 }}>{p.online ? '● Online' : '● Offline'}</Txt>
                    </View>
                  </View>
                  <View style={styles.partnerActions}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Chat with ${p.name}`}
                      onPress={() => openConversation(p)}
                      style={[styles.chatButtonOutline, styles.partnerAction]}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={17} color={orange} />
                      <Txt color={orange} size={12} bold>Start chat</Txt>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => startCall(p, 'audio')} disabled={Boolean(callStarting)} style={styles.partnerAction}>
                      <Ionicons name="call-outline" size={17} color={orange} />
                      <Txt color={orange} size={12} bold>Voice</Txt>
                    </TouchableOpacity>
                    {hasVideoEntitlement() ? (
                      <TouchableOpacity onPress={() => startCall(p, 'video')} disabled={Boolean(callStarting)} style={styles.partnerAction}>
                        <Ionicons name="videocam-outline" size={17} color={orange} />
                        <Txt color={orange} size={12} bold>Video</Txt>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={openSubscription} style={styles.partnerAction}>
                        <Ionicons name="lock-closed-outline" size={17} color={muted} />
                        <Txt color={muted} size={12} bold>Video</Txt>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              <Btn label="Start Practice Exercise" onPress={() => startPractice()} style={{ marginTop: 8 }} />
            </ScrollView>
          )}

          {screen === 'practiceSession' && (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
              <Header title={practiceTopic.title} subtitle={`Practice in ${learningLanguage || 'your learning language'}`} onBack={openPractice} />
              {practiceStep === 'exercise' ? (
                <>
                  <View style={styles.practicePromptCard}>
                    <Txt size={12} color={orange} bold>QUICK EXERCISE</Txt>
                    <Txt size={19} bold style={{ marginTop: 10, lineHeight: 27 }}>{practiceTopic.prompt}</Txt>
                  </View>
                  {practiceTopic.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      accessibilityRole="button"
                      onPress={() => setPracticeAnswer(option)}
                      style={[styles.practiceOption, practiceAnswer === option && styles.practiceOptionSelected]}
                    >
                      <Ionicons name={practiceAnswer === option ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={practiceAnswer === option ? orange : muted} />
                      <Txt size={14} color={practiceAnswer === option ? orange : navy} bold={practiceAnswer === option} style={{ flex: 1 }}>{option}</Txt>
                    </TouchableOpacity>
                  ))}
                  <Btn
                    label="Check answer"
                    disabled={!practiceAnswer}
                    onPress={() => {
                      if (practiceAnswer === practiceTopic.answer) completePractice();
                      else Alert.alert('Keep trying', 'Review the phrases and choose the best answer.');
                    }}
                    style={{ marginTop: 8 }}
                  />
                </>
              ) : (
                <>
                  <View style={styles.practiceCompleteCard}>
                    <Ionicons name="checkmark-circle" size={54} color={COLORS.success} />
                    <Txt size={21} bold style={{ marginTop: 12 }}>Great practice!</Txt>
                    <Txt color={muted} size={13} style={{ textAlign: 'center', marginTop: 8 }}>
                      You completed {practiceTopic.title}. Keep going to build your daily streak.
                    </Txt>
                  </View>
                  <Txt size={17} bold style={{ marginBottom: 10 }}>Useful phrases</Txt>
                  {practiceTopic.phrases.map((phrase) => <View key={phrase} style={styles.phraseRow}><Ionicons name="chatbubble-ellipses-outline" size={18} color={orange} /><Txt size={14} style={{ flex: 1 }}>{phrase}</Txt></View>)}
                  <Txt size={17} bold style={{ marginTop: 16, marginBottom: 10 }}>Vocabulary</Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {practiceTopic.vocabulary.map((item) => <View key={item} style={styles.vocabularyChip}><Txt size={12} color={orange} bold>{item}</Txt></View>)}
                  </View>
                  <Btn label="Practice another topic" outline onPress={openPractice} style={{ marginTop: 20 }} />
                  <Btn label="Find a practice partner" onPress={() => setScreen('discover')} style={{ marginTop: 10 }} />
                </>
              )}
            </ScrollView>
          )}

          {screen === 'premium' && (
            <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 32 }}>
              <Header title="BYTALK Premium" subtitle="Choose the plan that fits your language journey." onBack={() => setScreen('dashboard')} />
              {subscriptionError ? (
                <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#FFF0ED', marginBottom: 14 }}>
                  <Txt color={COLORS.error} size={12}>{subscriptionError}</Txt>
                  <Btn label="Retry" outline onPress={loadSubscription} disabled={subscriptionLoading} style={{ marginTop: 10, paddingVertical: 10 }} />
                </View>
              ) : null}
              {subscriptionLoading && subscriptionPlans.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={orange} />
                  <Txt size={12} color={muted} style={{ marginTop: 10 }}>Loading subscription plans…</Txt>
                </View>
              ) : null}
              <Txt size={12} color={muted} style={{ marginBottom: 14 }}>
                Current plan: <Txt bold color={navy}>{subscription?.plan?.name || 'Loading...'}</Txt> · {subscription?.status || 'unknown'}
              </Txt>
              {subscription?.expiresAt ? (
                <Txt size={11} color={muted} style={{ marginBottom: 14 }}>
                  {subscription.status === 'active' ? 'Renews or expires' : 'Expired'}: {new Date(subscription.expiresAt).toLocaleDateString()}
                  {subscription.renewalStatus ? ` · ${subscription.renewalStatus}` : ''}
                </Txt>
              ) : null}
              {!subscriptionLoading && subscriptionPlans.length === 0 && !subscriptionError ? (
                <Txt size={12} color={muted} style={{ marginBottom: 14 }}>No subscription plans are currently available.</Txt>
              ) : null}
              {subscriptionPlans.map((plan) => (
                <View key={plan.id} style={{ padding: 18, borderRadius: 16, borderWidth: plan.id === subscription?.plan?.id ? 2 : 1, borderColor: plan.id === subscription?.plan?.id ? orange : '#E9E7EF', backgroundColor: '#fff', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Txt size={18} bold>{plan.name}</Txt>
                    <Txt size={16} bold color={orange}>{plan.priceInr === 0 ? 'Free' : `₹${plan.priceInr}/${plan.billingInterval || 'month'}`}</Txt>
                  </View>
                  {plan.features.map((feature) => <Txt key={feature} size={12} color={muted} style={{ marginTop: 9 }}>✓ {feature}</Txt>)}
                  {plan.id !== 'free' && plan.id !== subscription?.plan?.id ? (
                    <Btn label={subscriptionBusy ? 'Processing...' : `Upgrade to ${plan.name}`} onPress={() => buySubscription(plan)} disabled={subscriptionBusy} style={{ marginTop: 14 }} />
                  ) : null}
                </View>
              ))}
              <Btn label="Restore purchases" outline onPress={restoreSubscription} disabled={subscriptionBusy} style={{ marginBottom: 14 }} />
              {subscription?.testMode ? (
                <View style={{ padding: 14, borderRadius: 12, backgroundColor: '#FFF8E8', marginBottom: 14 }}>
                  <Txt size={12} bold color="#8A5A00">Development-only test entitlements</Txt>
                  <Txt size={11} color="#8A5A00" style={{ marginTop: 5 }}>These controls are disabled when NODE_ENV is production and never represent a store purchase.</Txt>
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <Btn label="Test Plus" onPress={() => grantDevelopmentSubscription('plus')} disabled={subscriptionBusy} style={{ flex: 1, marginRight: 6 }} />
                    <Btn label="Test Pro" onPress={() => grantDevelopmentSubscription('pro')} disabled={subscriptionBusy} style={{ flex: 1, marginLeft: 6 }} />
                  </View>
                </View>
              ) : null}
              <Txt size={11} color={muted} style={{ lineHeight: 17 }}>
                Subscriptions renew monthly unless cancelled in your App Store or Google Play account. Web browsers do not support native in-app purchases in this build.
              </Txt>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                {TERMS_URL ? <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}><Txt size={12} color={orange} bold>Terms</Txt></TouchableOpacity> : null}
                {PRIVACY_URL ? <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} style={{ marginLeft: 18 }}><Txt size={12} color={orange} bold>Privacy</Txt></TouchableOpacity> : null}
              </View>
            </ScrollView>
          )}

          {/* SCREEN 9: LEARNING DASHBOARD */}
          {screen === 'dashboard' && (
            <ScrollView contentContainerStyle={{ padding: 22 }}>
              <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 20 }}>
                <Txt size={52}>👨🏽‍💻</Txt>
                <Txt size={20} bold style={{ marginTop: 6 }}>{name}</Txt>
                <Txt color={muted} size={13}>Profile · {country}</Txt>
              </View>
              <View style={styles.statsCard}>
                {[
                  ['🔥', '12', 'day streak'],
                  ['🕒', '180', 'speaking mins'],
                  ['⭐', String(28 + vocab.length), 'new words'],
                ].map(([emoji, n, label]) => (
                  <View key={label} style={{ alignItems: 'center' }}>
                    <Txt size={20}>{emoji} {n}</Txt>
                    <Txt size={11} color={muted} style={{ marginTop: 4 }}>{label}</Txt>
                  </View>
                ))}
              </View>
              <Section title="Your progress">
                <View style={{ backgroundColor: COLORS.lightBg, borderRadius: 15, padding: 18, borderColor: '#FFDDCF', borderWidth: 1 }}>
                  <Txt size={20} bold color={orange}>75% speaking goal</Txt>
                  <Txt size={13} color={muted} style={{ marginTop: 4 }}>150 / 200 minutes this week</Txt>
                  <View style={{ marginTop: 14, height: 8, borderRadius: 8, backgroundColor: '#FFD6C7' }}>
                    <View style={{ width: '75%', backgroundColor: orange, height: 8, borderRadius: 8 }} />
                  </View>
                </View>
              </Section>
              <Section title="Saved vocabulary">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={word}
                    onChangeText={setWord}
                    placeholder="Add new vocabulary..."
                    placeholderTextColor="#9CA3AF"
                    style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderColor: border, borderWidth: 1 }}
                  />
                  <Btn label="Add" onPress={addWord} style={{ paddingHorizontal: 22 }} />
                </View>
                <Txt color={muted} size={13} style={{ marginTop: 12 }}>{vocab.length} words saved</Txt>
                {vocab.map((v) => (
                  <Txt key={v.id} style={{ paddingVertical: 4 }}>📖 {v.word}</Txt>
                ))}
              </Section>
              <Section title="Call history">
                {callHistoryError ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => request('calls').then((history) => {
                      setCallHistory(history);
                      setCallHistoryError('');
                    }).catch((error) => setCallHistoryError(error.message || 'Could not load call history.'))}
                  >
                    <Txt color={COLORS.error} size={12}>{callHistoryError}  Tap to retry.</Txt>
                  </TouchableOpacity>
                ) : null}
                {callHistory.length === 0 ? (
                  <Txt size={12} color={muted}>Your incoming, outgoing, missed, and ended calls will appear here.</Txt>
                ) : callHistory.map((item) => {
                  const outgoing = item.callerId === userId;
                  const otherUserId = outgoing ? item.calleeId : item.callerId;
                  const otherUser = partners.find((partner) => partner.id === otherUserId);
                  const callStatus = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Ended';
                  return (
                    <View key={item.id} style={styles.callHistoryRow}>
                      <Ionicons
                        name={item.status === 'missed' ? 'call-outline' : outgoing ? 'arrow-up-outline' : 'arrow-down-outline'}
                        size={19}
                        color={item.status === 'missed' ? COLORS.error : orange}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Txt size={13} bold>{otherUser?.name || 'BYTALK user'}</Txt>
                        <Txt size={11} color={muted}>
                          {outgoing ? 'Outgoing' : 'Incoming'} {item.type === 'video' ? 'video' : 'voice'} · {callStatus}
                          {item.durationSeconds > 0 ? ` · ${Math.floor(item.durationSeconds / 60)}:${String(item.durationSeconds % 60).padStart(2, '0')}` : ''}
                        </Txt>
                      </View>
                      <Txt size={10} color={muted}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                      </Txt>
                    </View>
                  );
                })}
              </Section>
              <Section title="Practice interests">
                <Txt size={12} color={muted} style={{ marginBottom: 10 }}>
                  Choose the topics you want partners to see when they practice with you.
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PRACTICE_TOPICS.filter((topic) => topic.id !== 'All Topics').map((topic) => {
                    const selectedInterest = practiceInterests.includes(topic.id);
                    return (
                      <TouchableOpacity
                        key={topic.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selectedInterest }}
                        onPress={() => setPracticeInterests((previous) => selectedInterest
                          ? previous.filter((interest) => interest !== topic.id)
                          : [...previous, topic.id])}
                        style={[styles.interestChip, selectedInterest && styles.interestChipSelected]}
                      >
                        <Ionicons name={selectedInterest ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={selectedInterest ? orange : muted} />
                        <Txt size={12} color={selectedInterest ? orange : navy} bold={selectedInterest}>{topic.title}</Txt>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Btn
                  label={practiceInterestsSaving ? 'Saving...' : 'Save practice interests'}
                  onPress={savePracticeInterests}
                  disabled={practiceInterestsSaving}
                  style={{ marginTop: 14 }}
                />
              </Section>
              <Btn label="Update my level" outline onPress={() => setScreen('level')} style={{ marginBottom: 12 }} />
              <Btn label="BYTALK Premium" onPress={openSubscription} style={{ marginBottom: 12 }} />
              <Btn label="Log Out / Sign Out" outline onPress={handleLogout} style={{ marginBottom: 12 }} />
              <Btn label="Back to Welcome Screen" outline onPress={() => setScreen('welcome')} />
            </ScrollView>
          )}

          {/* BOTTOM TAB BAR (ONLY ON MAIN LOGGED-IN SCREENS) */}
          {!['welcome', 'login', 'register', 'onboard', 'level', 'call'].includes(screen) && (
            <View style={styles.tabBar}>
              {tabItems.map(([id, icon, label]) => (
                <TouchableOpacity key={id} onPress={() => {
                  if (id === 'chat') requestNotificationPermission();
                  if (id === 'practice') {
                    setSearch('');
                    setPracticeTopic(PRACTICE_TOPICS[0]);
                  }
                  setScreen(id === 'chat' ? 'messages' : id);
                }} style={styles.tabItem}>
                  <Ionicons name={icon} size={22} color={screen === id || (id === 'chat' && screen === 'messages') ? orange : '#98a3b3'} />
                  <Txt size={10} color={screen === id || (id === 'chat' && screen === 'messages') ? orange : muted} bold={screen === id || (id === 'chat' && screen === 'messages')}>{label}</Txt>
                  {id === 'chat' && Object.values(unreadByUser).reduce((sum, count) => sum + count, 0) > 0 && (
                    <View style={{ position: 'absolute', top: -3, right: 12, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt color="#fff" size={9} bold>{Object.values(unreadByUser).reduce((sum, count) => sum + count, 0)}</Txt>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const { width: windowWidth, height: screenHeight } = Dimensions.get('window');
const isLargeScreen = windowWidth > 500;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: isLargeScreen ? '#F4F5F8' : '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  webShell: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    ...(isLargeScreen
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 5,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: COLORS.border,
        }
      : {}),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  logoRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topLogoutButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  /* Welcome Screen Styles */
  welcomeScrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'web' ? 18 : 12,
    paddingBottom: Platform.OS === 'web' ? 22 : 16,
    backgroundColor: COLORS.lightBg,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconLarge: {
    width: 38,
    height: 38,
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  heroTextSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  heroMainTitle: {
    fontSize: Math.min(31, Math.max(25, windowWidth * 0.075)),
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: Math.min(38, Math.max(31, windowWidth * 0.09)),
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  heroIllustrationContainer: {
    width: '100%',
    flexGrow: 1,
    minHeight: 230,
    maxHeight: Math.min(420, screenHeight * 0.48),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  heroIllustrationImage: {
    width: '100%',
    height: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  welcomeFooter: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 6,
  },
  primaryButtonShadow: {
    width: '100%',
    borderRadius: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryGradientButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingBottom: 4,
  },
  footerLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  footerLinkBold: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },

  /* Auth Screens Common Styles (Login & Registration) */
  authScrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  authTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  authBrandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  authBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authLogoIcon: {
    width: 38,
    height: 38,
    marginBottom: 6,
  },
  authBrandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  authBrandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.8,
  },
  authHeadingBlock: {
    marginBottom: 22,
    alignItems: 'center',
  },
  authHeadingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  authHeadingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorAlertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0ED',
    borderColor: '#FECDCA',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  authForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 7,
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputFieldBoxFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFDFB',
  },
  authInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 6,
  },
  forgotPasswordRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    marginTop: -2,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  authFooterLinkRow: {
    marginTop: 'auto',
    paddingTop: 28,
    paddingBottom: 4,
  },

  /* Other Screens Styles */
  searchBar: {
    marginHorizontal: 22,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border,
  },
  partnerCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#F1F3F7',
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  discoverMessage: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  discoverRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#FFF0E8',
  },
  partnerActions: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
  },
  partnerAction: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 5,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFF7F2',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButtonOutline: {
    borderWidth: 1.5,
    borderColor: orange,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  callScreen: {
    flex: 1,
    backgroundColor: '#17172F',
    paddingBottom: 24,
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  callBackButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#303047',
  },
  callVideoStage: {
    flex: 1,
    minHeight: 220,
    marginHorizontal: 12,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#25253C',
    position: 'relative',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    minHeight: 220,
    backgroundColor: '#25253C',
  },
  localVideo: {
    position: 'absolute',
    width: 108,
    height: 148,
    right: 12,
    top: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#3A3A51',
  },
  localVideoFallback: {
    position: 'absolute',
    width: 108,
    height: 60,
    right: 12,
    top: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A51',
  },
  videoFallbackNotice: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#17172FDD',
  },
  voiceCallAvatarArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  callAvatar: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 66,
    backgroundColor: '#34344D',
  },
  callStatusArea: {
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  callControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  incomingCallActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 44,
    paddingVertical: 18,
  },
  callControl: {
    width: 60,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 22,
    backgroundColor: '#3A3A51',
  },
  callControlActive: {
    backgroundColor: '#63637B',
  },
  declineControl: {
    backgroundColor: '#D92D3B',
  },
  acceptControl: {
    backgroundColor: '#168653',
  },
  chatHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderColor: border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderColor: border,
  },
  chatInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: border,
    color: navy,
  },
  sendButton: {
    backgroundColor: orange,
    padding: 13,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceProgressCard: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 22,
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#FFD8C9',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: orange,
  },
  practiceTopicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  practiceTopicCardSelected: {
    borderColor: orange,
    backgroundColor: '#FFF8F4',
  },
  practiceTopicIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0E8',
  },
  practicePromptCard: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#FFD8C9',
    marginBottom: 16,
  },
  practiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  practiceOptionSelected: {
    borderColor: orange,
    backgroundColor: '#FFF8F4',
  },
  practiceCompleteCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#F0FBF5',
    marginBottom: 22,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F7',
  },
  vocabularyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFF0E8',
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
  },
  interestChipSelected: {
    borderColor: orange,
    backgroundColor: '#FFF0E8',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    padding: 18,
    borderRadius: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: border,
  },
  callHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F3F7',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#EEF0F4',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
});

export default App;
