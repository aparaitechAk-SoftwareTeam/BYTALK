import React, { useEffect, useState } from 'react';
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
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';

const API = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');
const orange = '#FF6847';
const orangeDark = '#FF5226';
const orangeLight = '#FFF4EE';
const navy = '#141727';
const muted = '#6B7280';
const light = '#F8FAFC';
const border = '#E5E7EB';

const fallbackPartners = [
  { id: 'u2', name: 'Yuki', country: 'Japan', nativeLanguage: 'Japanese', learningLanguage: 'English', level: 'Intermediate', online: true },
  { id: 'u3', name: 'Lucas', country: 'Brazil', nativeLanguage: 'Portuguese', learningLanguage: 'English', level: 'Beginner', online: true },
  { id: 'u4', name: 'Minji', country: 'South Korea', nativeLanguage: 'Korean', learningLanguage: 'English', level: 'Intermediate', online: true },
  { id: 'u5', name: 'Carlos', country: 'Mexico', nativeLanguage: 'Spanish', learningLanguage: 'English', level: 'Intermediate', online: true },
  { id: 'u6', name: 'Aditi', country: 'India', nativeLanguage: 'Hindi', learningLanguage: 'English', level: 'Beginner', online: true },
];

const fallbackRooms = [
  { id: 'r1', name: 'Everyday English', topic: 'English', level: 'Beginner - Intermediate', listeners: 24 },
  { id: 'r2', name: 'Travel stories', topic: 'Travel', level: 'Intermediate - Advanced', listeners: 18 },
  { id: 'r3', name: 'Movies & culture', topic: 'Culture', level: 'All levels', listeners: 32 },
  { id: 'r4', name: 'Language exchange', topic: 'Study', level: 'Beginner - Intermediate', listeners: 12 },
];

async function request(endpoint, options) {
  const response = await fetch(`${API}/api/${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error('Unable to connect to server');
  return response.json();
}

const Txt = ({ children, size = 14, color = navy, bold = false, style = {} }) => (
  <Text style={{ fontSize: size, color, fontWeight: bold ? '700' : '400', ...style }}>{children}</Text>
);

const Btn = ({ label, onPress, outline = false, style = {} }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={{
      backgroundColor: outline ? '#fff' : orange,
      borderWidth: outline ? 1.5 : 0,
      borderColor: orange,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    <Txt color={outline ? orange : '#fff'} bold size={15}>{label}</Txt>
  </TouchableOpacity>
);

const Section = ({ title, children }) => (
  <View style={{ marginBottom: 22 }}>
    <Txt size={16} bold style={{ marginBottom: 12 }}>{title}</Txt>
    {children}
  </View>
);

function App() {
  const [screen, setScreen] = useState('welcome');
  const [name, setName] = useState('Pavan Nerkar');
  const [country, setCountry] = useState('India');
  const [nativeLanguage, setNativeLanguage] = useState('Hindi');
  const [learningLanguage, setLearningLanguage] = useState('English');
  const [level, setLevel] = useState('Beginner');
  const [partners, setPartners] = useState(fallbackPartners);
  const [rooms, setRooms] = useState(fallbackRooms);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(fallbackPartners[0]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('All');
  const [vocab, setVocab] = useState([]);
  const [word, setWord] = useState('');
  const [backendUp, setBackendUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInShowPwd, setSignInShowPwd] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [signUpShowPwd, setSignUpShowPwd] = useState(false);
  const [signUpShowConfirm, setSignUpShowConfirm] = useState(false);

  const handleSignIn = async () => {
    if (!signInEmail.trim() || !signInPassword.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await request('auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      });
      setBackendUp(true);
    } catch {
      Alert.alert('Offline preview', 'Backend not reachable. Navigating in demo mode.');
    }
    setBusy(false);
    setScreen('discover');
  };

  const handleSignUp = async () => {
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword.trim()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (signUpPassword !== signUpConfirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await request('auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: signUpName, email: signUpEmail, password: signUpPassword }),
      });
      setBackendUp(true);
    } catch {
      Alert.alert('Offline preview', 'Backend not reachable. Navigating in demo mode.');
    }
    setBusy(false);
    setName(signUpName);
    setScreen('onboard');
  };

  const refresh = async () => {
    try {
      const [p, r, v] = await Promise.all([request('partners'), request('rooms'), request('vocabulary/u1')]);
      setPartners(p);
      setRooms(r);
      setVocab(v);
      setBackendUp(true);
    } catch {
      setBackendUp(false);
    }
  };

  useEffect(() => {
    refresh();
    const socket = io(API, { transports: ['websocket', 'polling'] });
    socket.on('message:new', (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    socket.on('rooms:changed', setRooms);
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (screen === 'chat') {
      request(`messages/u1/${selected.id}`)
        .then(setMessages)
        .catch(() => setMessages([]));
    }
  }, [selected, screen]);

  async function saveProfile(next) {
    setBusy(true);
    try {
      await request('onboard', {
        method: 'POST',
        body: JSON.stringify({ name, country, nativeLanguage, learningLanguage, level }),
      });
      setBackendUp(true);
    } catch {
      Alert.alert('Offline preview', 'Backend not reachable. Screen navigation still works.');
    }
    setBusy(false);
    setScreen(next);
  }

  async function send() {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    try {
      const result = await request('messages', {
        method: 'POST',
        body: JSON.stringify({ from: 'u1', to: selected.id, text }),
      });
      setMessages((prev) => (prev.some((x) => x.id === result.id) ? prev : [...prev, result]));
    } catch {
      Alert.alert('Failed to send', 'Connect mobile to backend first.');
      setDraft(text);
    }
  }

  async function join(room) {
    try {
      await request(`rooms/${room.id}/join`, { method: 'POST' });
      Alert.alert('Joined demo room', `You're in ${room.name}. Live microphone streaming is not yet included.`);
      refresh();
    } catch {
      Alert.alert('Cannot join', 'Start and connect backend first.');
    }
  }

  async function addWord() {
    if (!word.trim()) return;
    try {
      const x = await request('vocabulary', {
        method: 'POST',
        body: JSON.stringify({ userId: 'u1', word, category: 'Conversation' }),
      });
      setVocab((v) => [...v, x]);
      setWord('');
    } catch {
      Alert.alert('Connection required', 'Start backend first.');
    }
  }

  const tabItems = [
    ['discover', 'compass', 'Discover'],
    ['rooms', 'mic', 'Rooms'],
    ['chat', 'chatbubbles', 'Messages'],
    ['dashboard', 'bar-chart', 'Profile'],
  ];

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top brand header (only shown when not on welcome screen) */}
      {!['welcome', 'signin', 'signup'].includes(screen) && (
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setScreen('welcome')} style={styles.logoRowSmall}>
            <Image source={require('./assets/logo_icon.png')} style={{ width: 22, height: 22, marginRight: 6 }} resizeMode="contain" />
            <Text style={{ fontSize: 20, fontWeight: '900', color: navy }}>
              BY<Text style={{ color: orange }}>TALK</Text>
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 7, height: 7, borderRadius: 6, backgroundColor: backendUp ? '#16c67a' : '#f0b64a' }} />
            <Txt size={11} color={muted}>{backendUp ? 'Connected' : 'Offline demo'}</Txt>
          </View>
        </View>
      )}

      {/* SCREEN 1: WELCOME / LANDING (EXACT DESIGN MATCH IN ORANGE THEME) */}
      {screen === 'welcome' && (
        <ScrollView
          contentContainerStyle={styles.welcomeScrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Logo Section */}
          <View style={styles.welcomeHeader}>
            <View style={styles.brandRow}>
              <Image
                source={require('./assets/logo_icon.png')}
                style={styles.logoIconLarge}
                resizeMode="contain"
              />
              <Text style={styles.brandTitle}>BYTALK</Text>
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

          {/* Center 3D Characters, Globe & Flags Illustration */}
          <View style={styles.heroIllustrationContainer}>
            <Image
              source={require('./assets/hero_illustration.png')}
              style={styles.heroIllustrationImage}
              resizeMode="contain"
            />
          </View>

          {/* Bottom Call to Action Section */}
          <View style={styles.welcomeFooter}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.getStartedButtonShadow}
              onPress={() => setScreen('onboard')}
            >
              <LinearGradient
                colors={['#FF7547', '#FF5024']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.getStartedGradient}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={19} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.signInRow}>
              <Text style={styles.signInLabel}>Already have an account? </Text>
              <TouchableOpacity onPress={() => setScreen('signin')} activeOpacity={0.7}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* SCREEN: SIGN IN */}
      {screen === 'signin' && (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity onPress={() => setScreen('welcome')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
            <Ionicons name="chevron-back" size={24} color={navy} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={require('./assets/logo_icon.png')} style={{ width: 34, height: 34, marginRight: 8 }} resizeMode="contain" />
              <Text style={{ fontSize: 24, fontWeight: '900', color: navy }}>BY<Text style={{ color: orange }}>TALK</Text></Text>
            </View>
            <Txt size={11} color={muted} style={{ marginTop: 3, letterSpacing: 1.5 }}>Talk  \u2022  Learn  \u2022  Connect</Txt>
          </View>

          {/* Title */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Txt size={26} bold style={{ textAlign: 'center' }}>Welcome Back</Txt>
            <Txt size={14} color={muted} style={{ textAlign: 'center', marginTop: 8 }}>Sign in to continue your language journey</Txt>
          </View>

          {/* Email field */}
          <View style={authStyles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={muted} style={{ marginRight: 12 }} />
            <TextInput
              value={signInEmail}
              onChangeText={setSignInEmail}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              style={authStyles.inputText}
            />
          </View>

          {/* Password field */}
          <View style={authStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={muted} style={{ marginRight: 12 }} />
            <TextInput
              value={signInPassword}
              onChangeText={setSignInPassword}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!signInShowPwd}
              style={authStyles.inputText}
            />
            <TouchableOpacity onPress={() => setSignInShowPwd(!signInShowPwd)}>
              <Ionicons name={signInShowPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={muted} />
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
            <Txt size={13} color={orange} bold>Forgot Password?</Txt>
          </TouchableOpacity>

          {/* Sign In button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSignIn}
            style={authStyles.primaryButton}
          >
            <Txt color="#fff" bold size={16}>{busy ? 'Signing In...' : 'Sign In'}</Txt>
          </TouchableOpacity>

          {/* OR divider */}
          <View style={authStyles.orRow}>
            <View style={authStyles.orLine} />
            <Txt size={13} color={muted} style={{ marginHorizontal: 14 }}>OR</Txt>
            <View style={authStyles.orLine} />
          </View>

          {/* Social buttons */}
          <TouchableOpacity style={authStyles.socialButton}>
            <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 12 }} />
            <Txt size={14} bold>Continue with Google</Txt>
          </TouchableOpacity>
          <TouchableOpacity style={authStyles.socialButton}>
            <Ionicons name="logo-apple" size={20} color="#000" style={{ marginRight: 12 }} />
            <Txt size={14} bold>Continue with Apple</Txt>
          </TouchableOpacity>
          <TouchableOpacity style={authStyles.socialButton}>
            <Ionicons name="logo-facebook" size={20} color="#1877F2" style={{ marginRight: 12 }} />
            <Txt size={14} bold>Continue with Facebook</Txt>
          </TouchableOpacity>

          {/* Don't have account */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28 }}>
            <Txt size={14} color={muted}>Don't have an account?  </Txt>
            <TouchableOpacity onPress={() => setScreen('signup')}>
              <Txt size={14} color={orange} bold>Sign Up</Txt>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* SCREEN: SIGN UP */}
      {screen === 'signup' && (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity onPress={() => setScreen('signin')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 8 }}>
            <Ionicons name="chevron-back" size={24} color={navy} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={require('./assets/logo_icon.png')} style={{ width: 34, height: 34, marginRight: 8 }} resizeMode="contain" />
              <Text style={{ fontSize: 24, fontWeight: '900', color: navy }}>BY<Text style={{ color: orange }}>TALK</Text></Text>
            </View>
            <Txt size={11} color={muted} style={{ marginTop: 3, letterSpacing: 1.5 }}>Talk  \u2022  Learn  \u2022  Connect</Txt>
          </View>

          {/* Title */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Txt size={26} bold style={{ textAlign: 'center' }}>Create Account</Txt>
            <Txt size={14} color={muted} style={{ textAlign: 'center', marginTop: 8 }}>Start your language learning journey</Txt>
          </View>

          {/* Full Name */}
          <View style={authStyles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={muted} style={{ marginRight: 12 }} />
            <TextInput
              value={signUpName}
              onChangeText={setSignUpName}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              style={authStyles.inputText}
            />
          </View>

          {/* Email */}
          <View style={authStyles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={muted} style={{ marginRight: 12 }} />
            <TextInput
              value={signUpEmail}
              onChangeText={setSignUpEmail}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              style={authStyles.inputText}
            />
          </View>

          {/* Password */}
          <View style={authStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={muted} style={{ marginRight: 12 }} />
            <TextInput
              value={signUpPassword}
              onChangeText={setSignUpPassword}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!signUpShowPwd}
              style={authStyles.inputText}
            />
            <TouchableOpacity onPress={() => setSignUpShowPwd(!signUpShowPwd)}>
              <Ionicons name={signUpShowPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={muted} />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={authStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={muted} style={{ marginRight: 12 }} />
            <TextInput
              value={signUpConfirm}
              onChangeText={setSignUpConfirm}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!signUpShowConfirm}
              style={authStyles.inputText}
            />
            <TouchableOpacity onPress={() => setSignUpShowConfirm(!signUpShowConfirm)}>
              <Ionicons name={signUpShowConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={muted} />
            </TouchableOpacity>
          </View>

          {/* Sign Up button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSignUp}
            style={[authStyles.primaryButton, { marginTop: 6 }]}
          >
            <Txt color="#fff" bold size={16}>{busy ? 'Creating Account...' : 'Sign Up'}</Txt>
          </TouchableOpacity>

          {/* OR divider */}
          <View style={authStyles.orRow}>
            <View style={authStyles.orLine} />
            <Txt size={13} color={muted} style={{ marginHorizontal: 14 }}>OR</Txt>
            <View style={authStyles.orLine} />
          </View>

          {/* Social buttons */}
          <TouchableOpacity style={authStyles.socialButton}>
            <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 12 }} />
            <Txt size={14} bold>Continue with Google</Txt>
          </TouchableOpacity>
          <TouchableOpacity style={authStyles.socialButton}>
            <Ionicons name="logo-apple" size={20} color="#000" style={{ marginRight: 12 }} />
            <Txt size={14} bold>Continue with Apple</Txt>
          </TouchableOpacity>
          <TouchableOpacity style={authStyles.socialButton}>
            <Ionicons name="logo-facebook" size={20} color="#1877F2" style={{ marginRight: 12 }} />
            <Txt size={14} bold>Continue with Facebook</Txt>
          </TouchableOpacity>

          {/* Terms */}
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <Txt size={12} color={muted} style={{ textAlign: 'center' }}>By signing up, you agree to our</Txt>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <TouchableOpacity><Txt size={12} color={orange} bold>Terms of Service</Txt></TouchableOpacity>
              <Txt size={12} color={muted}>  and  </Txt>
              <TouchableOpacity><Txt size={12} color={orange} bold>Privacy Policy</Txt></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* SCREEN 2: ONBOARDING PROFILE SETUP */}
      {screen === 'onboard' && (
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
          <TouchableOpacity onPress={() => setScreen('welcome')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
            <Ionicons name="arrow-back" size={20} color={navy} />
            <Txt size={14} color={muted} style={{ marginLeft: 6 }}>Back to Welcome</Txt>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <Txt size={26} bold style={{ textAlign: 'center' }}>Your language{'\n'}journey starts here</Txt>
            <Txt color={muted} style={{ textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
              Tell us about yourself to match you with native speakers worldwide.
            </Txt>
          </View>
          <Field label="Your name" value={name} setValue={setName} placeholder="e.g. Alex Smith" />
          <Field label="My native language" value={nativeLanguage} setValue={setNativeLanguage} placeholder="e.g. English" />
          <Field label="I want to learn" value={learningLanguage} setValue={setLearningLanguage} placeholder="e.g. Spanish" />
          <Field label="I am from" value={country} setValue={setCountry} placeholder="e.g. United States" />
          <Btn label="Next  →" onPress={() => setScreen('level')} style={{ marginTop: 15 }} />
        </ScrollView>
      )}

      {/* SCREEN 3: PROFICIENCY LEVEL */}
      {screen === 'level' && (
        <ScrollView contentContainerStyle={{ padding: 22 }}>
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
                backgroundColor: level === n ? orangeLight : '#fff',
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

      {/* SCREEN 4: DISCOVER PARTNERS */}
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
          <ScrollView contentContainerStyle={{ padding: 22 }}>
            {partners
              .filter((p) => [p.name, p.country, p.nativeLanguage, p.level].join(' ').toLowerCase().includes(search.toLowerCase()))
              .map((p, i) => (
                <View key={p.id} style={styles.partnerCard}>
                  <View style={[styles.avatarCircle, { backgroundColor: ['#FFE0D3', '#D6EBFC', '#FFE8D9'][i % 3] }]}>
                    <Txt size={25}>{['👩🏻', '👨🏽', '👩🏻‍🦰', '👨🏾', '👩🏽'][i % 5]}</Txt>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Txt bold size={15}>
                      {p.name}  <Txt size={12} color={muted}>{p.country}</Txt>
                    </Txt>
                    <Txt size={11} color={muted} style={{ marginTop: 2 }}>
                      Speaks: {p.nativeLanguage}, {p.learningLanguage}
                    </Txt>
                    <Txt size={11} color="#FF6847" style={{ marginTop: 2, fontWeight: '600' }}>
                      {p.level}  ·  {p.learningLanguage}
                    </Txt>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelected(p);
                      setScreen('chat');
                    }}
                    style={styles.chatButtonOutline}
                  >
                    <Txt color={orange} size={12} bold>Start chat</Txt>
                  </TouchableOpacity>
                </View>
              ))}
          </ScrollView>
        </>
      )}

      {/* SCREEN 5: CHAT */}
      {screen === 'chat' && (
        <>
          <TouchableOpacity
            onPress={() => setScreen('discover')}
            style={styles.chatHeader}
          >
            <Ionicons name="arrow-back" size={22} color={navy} />
            <View>
              <Txt size={17} bold>{selected.name}  <Txt size={12} color="#18b576">● Online</Txt></Txt>
              <Txt size={11} color={muted}>{selected.country} · {selected.learningLanguage}</Txt>
            </View>
          </TouchableOpacity>
          <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'flex-end' }}>
            {messages
              .filter((m) => (m.from === selected.id && m.to === 'u1') || (m.from === 'u1' && m.to === selected.id))
              .map((m) => (
                <View
                  key={m.id}
                  style={{
                    alignSelf: m.from === 'u1' ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    marginBottom: 12,
                    backgroundColor: m.from === 'u1' ? orangeLight : light,
                    borderColor: m.from === 'u1' ? '#FFD8C9' : '#ECEFF3',
                    borderWidth: 1,
                    padding: 14,
                    borderRadius: 16,
                  }}
                >
                  <Txt color={navy} size={14}>{m.text}</Txt>
                  <Txt color={muted} size={10} style={{ marginTop: 5, alignSelf: 'flex-end' }}>
                    {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Txt>
                </View>
              ))}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={draft}
              onChangeText={setDraft}
              style={styles.chatInput}
            />
            <TouchableOpacity onPress={send} style={styles.sendButton}>
              <Ionicons name="send" color="#fff" size={18} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* SCREEN 6: ROOMS */}
      {screen === 'rooms' && (
        <>
          <Header title="Live speaking rooms" subtitle="Join live audio rooms to practice with people around the world." />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {['All', 'English', 'Travel', 'Culture', 'Study'].map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    backgroundColor: filter === f ? orange : light,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                >
                  <Txt size={12} color={filter === f ? '#fff' : navy} bold={filter === f}>{f}</Txt>
                </TouchableOpacity>
              ))}
            </View>
            {rooms
              .filter((r) => filter === 'All' || r.topic === filter)
              .map((room, i) => (
                <View key={room.id} style={styles.roomCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ backgroundColor: ['#FFE3C9', '#CDE8FB', '#E1F5E5', '#E7DDFE'][i % 4], borderRadius: 12, padding: 12 }}>
                      <Txt size={22}>{['🎙️', '✈️', '🎬', '💬'][i % 4]}</Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt bold size={15}>{room.name}</Txt>
                      <Txt size={12} color={muted} style={{ marginTop: 2 }}>{room.level}</Txt>
                    </View>
                    <Txt size={11} color="#16ac64" bold>● Live</Txt>
                  </View>
                  <Txt size={12} color={muted} style={{ marginVertical: 14 }}>
                    👥 {room.listeners + (room.joined || 0)} listening
                  </Txt>
                  <Btn label="Join room" onPress={() => join(room)} />
                </View>
              ))}
          </ScrollView>
        </>
      )}

      {/* SCREEN 7: PROFILE / DASHBOARD */}
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
            <View style={{ backgroundColor: orangeLight, borderRadius: 15, padding: 18, borderColor: '#FFDDCF', borderWidth: 1 }}>
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
                style={{ flex: 1, backgroundColor: light, borderRadius: 12, padding: 14, borderColor: border, borderWidth: 1 }}
              />
              <Btn label="Add" onPress={addWord} style={{ paddingHorizontal: 22 }} />
            </View>
            <Txt color={muted} size={13} style={{ marginTop: 12 }}>{vocab.length} words saved</Txt>
            {vocab.map((v) => (
              <Txt key={v.id} style={{ paddingVertical: 4 }}>📖 {v.word}</Txt>
            ))}
          </Section>
          <Btn label="Update my level" outline onPress={() => setScreen('level')} style={{ marginBottom: 12 }} />
          <Btn label="Back to Welcome Screen" outline onPress={() => setScreen('welcome')} />
        </ScrollView>
      )}

      {/* BOTTOM TAB BAR (VISIBLE ON MAIN SCREENS) */}
      {!['welcome', 'onboard', 'level', 'signin', 'signup'].includes(screen) && (
        <View style={styles.tabBar}>
          {tabItems.map(([id, icon, label]) => (
            <TouchableOpacity key={id} onPress={() => setScreen(id)} style={styles.tabItem}>
              <Ionicons name={icon} size={22} color={screen === id ? orange : '#98a3b3'} />
              <Txt size={10} color={screen === id ? orange : muted} bold={screen === id}>{label}</Txt>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 6,
  },
  logoRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* Welcome Screen Styles */
  welcomeScrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  welcomeHeader: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
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
    color: '#1A1D2E',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 3,
    letterSpacing: 0.8,
  },
  heroTextSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  heroMainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSubText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  heroIllustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    minHeight: Math.min(270, screenHeight * 0.38),
  },
  heroIllustrationImage: {
    width: '100%',
    height: Math.min(270, screenHeight * 0.38),
    maxWidth: 380,
  },
  welcomeFooter: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
  },
  getStartedButtonShadow: {
    width: '100%',
    borderRadius: 28,
    shadowColor: '#FF6847',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  getStartedGradient: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingBottom: 4,
  },
  signInLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  signInLink: {
    fontSize: 14,
    color: orange,
    fontWeight: '700',
  },

  /* Other screen styles */
  searchBar: {
    marginHorizontal: 22,
    backgroundColor: light,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border,
  },
  partnerCard: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F1F3F7',
    alignItems: 'center',
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
    backgroundColor: light,
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
  roomCard: {
    borderWidth: 1,
    borderColor: border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: light,
    padding: 18,
    borderRadius: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: border,
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

const authStyles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 4,
    marginBottom: 14,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#141727',
  },
  primaryButton: {
    backgroundColor: '#FF6847',
    paddingVertical: 16,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6847',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 26,
    paddingVertical: 14,
    marginBottom: 12,
  },
});

export default App;
