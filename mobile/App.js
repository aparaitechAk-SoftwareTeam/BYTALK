<<<<<<< Updated upstream
import React,{useEffect,useState} from 'react';
import { View,Text,TextInput,TouchableOpacity,ScrollView,SafeAreaView,StatusBar,KeyboardAvoidingView,Platform,Alert,ActivityIndicator } from 'react-native';
=======
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
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
>>>>>>> Stashed changes
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
<<<<<<< Updated upstream
const API=process.env.EXPO_PUBLIC_API_URL || (Platform.OS==='android'?'http://10.0.2.2:4000':'http://localhost:4000');
const orange='#ff6847',navy='#142447',muted='#788496',light='#f5f7fb';
const fallbackPartners=[{id:'u2',name:'Yuki',country:'Japan',nativeLanguage:'Japanese',learningLanguage:'English',level:'Intermediate',online:true},{id:'u3',name:'Lucas',country:'Brazil',nativeLanguage:'Portuguese',learningLanguage:'English',level:'Beginner',online:true},{id:'u4',name:'Minji',country:'South Korea',nativeLanguage:'Korean',learningLanguage:'English',level:'Intermediate',online:true},{id:'u5',name:'Carlos',country:'Mexico',nativeLanguage:'Spanish',learningLanguage:'English',level:'Intermediate',online:true},{id:'u6',name:'Aditi',country:'India',nativeLanguage:'Hindi',learningLanguage:'English',level:'Beginner',online:true}];
const fallbackRooms=[{id:'r1',name:'Everyday English',topic:'English',level:'Beginner - Intermediate',listeners:24},{id:'r2',name:'Travel stories',topic:'Travel',level:'Intermediate - Advanced',listeners:18},{id:'r3',name:'Movies & culture',topic:'Culture',level:'All levels',listeners:32},{id:'r4',name:'Language exchange',topic:'Study',level:'Beginner - Intermediate',listeners:12}];
async function request(endpoint,options){const response=await fetch(`${API}/api/${endpoint}`,{headers:{'Content-Type':'application/json'},...options});if(!response.ok)throw new Error('Unable to connect to server');return response.json();}
const Txt=({children,size=14,color=navy,bold=false,style={}})=><Text style={{fontSize:size,color,fontWeight:bold?'700':'400',...style}}>{children}</Text>;
const Btn=({label,onPress,outline=false,style={}})=><TouchableOpacity onPress={onPress} style={{backgroundColor:outline?'#fff':orange,borderWidth:outline?1:0,borderColor:orange,padding:15,borderRadius:26,alignItems:'center',...style}}><Txt color={outline?orange:'#fff'} bold>{label}</Txt></TouchableOpacity>;
const Section=({title,children})=><View style={{marginBottom:22}}><Txt size={16} bold style={{marginBottom:12}}>{title}</Txt>{children}</View>;
function App(){const[screen,setScreen]=useState('onboard'),[name,setName]=useState('Pavan Nerkar'),[country,setCountry]=useState('India'),[nativeLanguage,setNativeLanguage]=useState('Hindi'),[learningLanguage,setLearningLanguage]=useState('English'),[level,setLevel]=useState('Beginner'),[partners,setPartners]=useState(fallbackPartners),[rooms,setRooms]=useState(fallbackRooms),[search,setSearch]=useState(''),[selected,setSelected]=useState(fallbackPartners[0]),[messages,setMessages]=useState([]),[draft,setDraft]=useState(''),[filter,setFilter]=useState('All'),[vocab,setVocab]=useState([]),[word,setWord]=useState(''),[backendUp,setBackendUp]=useState(false),[busy,setBusy]=useState(false);
const refresh=async()=>{try{const [p,r,v]=await Promise.all([request('partners'),request('rooms'),request('vocabulary/u1')]);setPartners(p);setRooms(r);setVocab(v);setBackendUp(true);}catch{setBackendUp(false)}};
useEffect(()=>{refresh();const socket=io(API,{transports:['websocket','polling']});socket.on('message:new',m=>{setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m])});socket.on('rooms:changed',setRooms);return()=>socket.disconnect()},[]);
useEffect(()=>{if(screen==='chat'){request(`messages/u1/${selected.id}`).then(setMessages).catch(()=>setMessages([]))}},[selected,screen]);
async function saveProfile(next){setBusy(true);try{await request('onboard',{method:'POST',body:JSON.stringify({name,country,nativeLanguage,learningLanguage,level})});setBackendUp(true)}catch{Alert.alert('Offline preview','Backend not reachable. Screen navigation still works.')}setBusy(false);setScreen(next)}
async function send(){if(!draft.trim())return;const text=draft.trim();setDraft('');try{const result=await request('messages',{method:'POST',body:JSON.stringify({from:'u1',to:selected.id,text})});setMessages(prev=>prev.some(x=>x.id===result.id)?prev:[...prev,result])}catch{Alert.alert('Failed to send','Connect mobile to backend first.');setDraft(text)}}
async function join(room){try{await request(`rooms/${room.id}/join`,{method:'POST'});Alert.alert('Joined demo room',`You're in ${room.name}. Live microphone streaming is not yet included.`);refresh()}catch{Alert.alert('Cannot join','Start and connect backend first.')}}
async function addWord(){if(!word.trim())return;try{const x=await request('vocabulary',{method:'POST',body:JSON.stringify({userId:'u1',word,category:'Conversation'})});setVocab(v=>[...v,x]);setWord('')}catch{Alert.alert('Connection required','Start backend first.')}}
const tabItems=[['discover','compass','Discover'],['rooms','mic','Rooms'],['chat','chatbubbles','Messages'],['dashboard','bar-chart','Profile']];
const Header=({title,subtitle})=><View style={{paddingHorizontal:22,paddingTop:18,paddingBottom:14}}><Txt size={27} bold>{title}</Txt>{subtitle&&<Txt color={muted} style={{marginTop:5}}>{subtitle}</Txt>}</View>;
const Field=({label,value,setValue,placeholder})=><View style={{marginBottom:15}}><Txt size={13} bold style={{marginBottom:8}}>{label}</Txt><TextInput value={value} onChangeText={setValue} placeholder={placeholder} style={{backgroundColor:'#fff',borderColor:'#e0e5ee',borderWidth:1,borderRadius:13,padding:15,color:navy,fontSize:15}}/></View>;
return <SafeAreaView style={{flex:1,backgroundColor:'#fff',paddingTop:Platform.OS==='android'?StatusBar.currentHeight:0}}><StatusBar barStyle="dark-content" backgroundColor="#fff"/>
<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:22,paddingTop:9}}><Text style={{fontSize:22,fontWeight:'900',color:navy}}>BY<Text style={{color:orange}}>TALK</Text></Text><View style={{flexDirection:'row',alignItems:'center',gap:7}}><View style={{width:7,height:7,borderRadius:6,backgroundColor:backendUp?'#16c67a':'#f0b64a'}}/><Txt size={11} color={muted}>{backendUp?'Connected':'Offline demo'}</Txt></View></View>
{screen==='onboard'&&<ScrollView contentContainerStyle={{padding:24,flexGrow:1}}><View style={{alignItems:'center',paddingVertical:30}}><Txt size={29} bold style={{textAlign:'center'}}>Your language{ '\n'}journey starts here</Txt><Txt color={muted} style={{textAlign:'center',marginTop:12}}>Connect with people around the world and learn through real conversations.</Txt><Text style={{fontSize:86,marginTop:25}}>🌍🗣️</Text></View><Field label="Your name" value={name} setValue={setName}/><Field label="My native language" value={nativeLanguage} setValue={setNativeLanguage}/><Field label="I want to learn" value={learningLanguage} setValue={setLearningLanguage}/><Field label="I am from" value={country} setValue={setCountry}/><Btn label="Next  →" onPress={()=>setScreen('level')} style={{marginTop:15}}/></ScrollView>}
{screen==='level'&&<ScrollView contentContainerStyle={{padding:22}}><Header title="Choose your level" subtitle="Select your current level so we can find the best partners for you."/>{[['🌱','Beginner','I know a few basic words and phrases.'],['🍃','Elementary','I can have simple conversations.'],['📊','Intermediate','I can communicate in daily situations.'],['📘','Upper Intermediate','I can discuss familiar topics with confidence.'],['🎓','Advanced','I can express myself fluently.'],['👑','Proficient','I can communicate like a native.']].map(([emoji,n,desc])=><TouchableOpacity key={n} onPress={()=>setLevel(n)} style={{flexDirection:'row',alignItems:'center',padding:14,marginBottom:11,borderWidth:1.5,borderColor:level===n?orange:'#e6eaf0',borderRadius:13,backgroundColor:level===n?'#fff5f0':'#fff'}}><Txt size={28}>{emoji}</Txt><View style={{flex:1,marginLeft:15}}><Txt bold>{n}</Txt><Txt size={12} color={muted}>{desc}</Txt></View><Ionicons name={level===n?'radio-button-on':'radio-button-off'} color={level===n?orange:'#aab3c0'} size={22}/></TouchableOpacity>)}<Btn label={busy?'Saving...':'Continue  →'} onPress={()=>saveProfile('discover')}/></ScrollView>}
{screen==='discover'&&<><Header title="Find your speaking partner" subtitle="Meet people from around the world and practice together."/><View style={{marginHorizontal:22,backgroundColor:light,borderRadius:12,paddingHorizontal:15,flexDirection:'row',alignItems:'center'}}><Ionicons name="search" size={19} color={muted}/><TextInput placeholder="Search by name, country, language..." value={search} onChangeText={setSearch} style={{flex:1,padding:13,color:navy}}/></View><ScrollView contentContainerStyle={{padding:22}}>{partners.filter(p=>[p.name,p.country,p.nativeLanguage,p.level].join(' ').toLowerCase().includes(search.toLowerCase())).map((p,i)=><View key={p.id} style={{flexDirection:'row',paddingVertical:13,borderBottomWidth:1,borderColor:'#f0f1f4',alignItems:'center'}}><View style={{width:53,height:53,borderRadius:30,backgroundColor:['#ffe0d3','#d6ebfc','#e8dafc'][i%3],alignItems:'center',justifyContent:'center'}}><Txt size={25}>{['👩🏻','👨🏽','👩🏻‍🦰','👨🏾','👩🏽'][i%5]}</Txt></View><View style={{flex:1,marginLeft:12}}><Txt bold>{p.name}  <Txt size={12} color={muted}>{p.country}</Txt></Txt><Txt size={11} color={muted}>Speaks: {p.nativeLanguage}, {p.learningLanguage}</Txt><Txt size={11} color="#368acb">{p.level}  ·  {p.learningLanguage}</Txt></View><TouchableOpacity onPress={()=>{setSelected(p);setScreen('chat')}} style={{borderWidth:1,borderColor:orange,borderRadius:15,padding:8}}><Txt color={orange} size={11}>Start chat</Txt></TouchableOpacity></View>)}</ScrollView></>}
{screen==='chat'&&<><TouchableOpacity onPress={()=>setScreen('discover')} style={{padding:18,borderBottomWidth:1,borderColor:'#edf0f5',flexDirection:'row',alignItems:'center',gap:15}}><Ionicons name="arrow-back" size={22} color={navy}/><View><Txt size={18} bold>{selected.name}  <Txt size={13} color="#18b576">● Online</Txt></Txt><Txt size={12} color={muted}>{selected.country}</Txt></View></TouchableOpacity><ScrollView contentContainerStyle={{padding:16,flexGrow:1,justifyContent:'flex-end'}}>{messages.filter(m=>(m.from===selected.id&&m.to==='u1')||(m.from==='u1'&&m.to===selected.id)).map(m=><View key={m.id} style={{alignSelf:m.from==='u1'?'flex-end':'flex-start',maxWidth:'84%',marginBottom:12,backgroundColor:m.from==='u1'?'#ffe9dd':light,padding:15,borderRadius:15}}><Txt>{m.text}</Txt><Txt color={muted} size={10} style={{marginTop:6}}>{new Date(m.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Txt></View>)}</ScrollView><View style={{flexDirection:'row',alignItems:'center',padding:14,gap:10}}><TextInput placeholder="Type a message..." value={draft} onChangeText={setDraft} style={{backgroundColor:light,borderRadius:24,paddingHorizontal:18,paddingVertical:12,flex:1}}/><TouchableOpacity onPress={send} style={{backgroundColor:orange,padding:13,borderRadius:30}}><Ionicons name="send" color="#fff" size={20}/></TouchableOpacity></View></>}
{screen==='rooms'&&<><Header title="Live speaking rooms" subtitle="Join live audio rooms to practice with people around the world."/><ScrollView contentContainerStyle={{paddingHorizontal:20}}><View style={{flexDirection:'row',gap:8,marginBottom:18}}>{['All','English','Travel','Culture','Study'].map(f=><TouchableOpacity key={f} onPress={()=>setFilter(f)} style={{backgroundColor:filter===f?orange:light,paddingHorizontal:12,paddingVertical:8,borderRadius:20}}><Txt size={12} color={filter===f?'#fff':navy}>{f}</Txt></TouchableOpacity>)}</View>{rooms.filter(r=>filter==='All'||r.topic===filter).map((room,i)=><View key={room.id} style={{borderWidth:1,borderColor:'#ecedf0',borderRadius:16,padding:16,marginBottom:14}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{backgroundColor:['#ffe3c9','#cde8fb','#e1f5e5','#e7ddfe'][i%4],borderRadius:10,padding:12}}><Txt size={21}>{['🎙️','✈️','🎬','💬'][i%4]}</Txt></View><View style={{flex:1}}><Txt bold>{room.name}</Txt><Txt size={12} color={muted}>{room.level}</Txt></View><Txt size={11} color="#16ac64">● Live now</Txt></View><Txt size={12} color={muted} style={{marginVertical:14}}>👥 {room.listeners+(room.joined||0)} listening</Txt><Btn label="Join room" onPress={()=>join(room)}/></View>)}</ScrollView></>}
{screen==='dashboard'&&<ScrollView contentContainerStyle={{padding:22}}><View style={{alignItems:'center',marginTop:18,marginBottom:25}}><Txt size={56}>👨🏽‍💻</Txt><Txt size={21} bold>{name}</Txt><Txt color={muted}>Edit Profile · {country}</Txt></View><View style={{flexDirection:'row',justifyContent:'space-around',backgroundColor:light,padding:20,borderRadius:16,marginBottom:25}}>{[['🔥','12','day streak'],['🕒','180','speaking mins'],['⭐',String(28+vocab.length),'new words']].map(([emoji,n,label])=><View key={label} style={{alignItems:'center'}}><Txt size={22}>{emoji} {n}</Txt><Txt size={11} color={muted}>{label}</Txt></View>)}</View><Section title="Your progress"><View style={{backgroundColor:'#effaf5',borderRadius:15,padding:20}}><Txt size={23} bold color="#12a967">75% speaking goal</Txt><Txt size={13} color={muted}>150 / 200 minutes this week</Txt><View style={{marginTop:18,height:10,borderRadius:8,backgroundColor:'#d6e8db'}}><View style={{width:'75%',backgroundColor:'#13be71',height:10,borderRadius:8}}/></View></View></Section><Section title="Saved vocabulary"><View style={{flexDirection:'row',gap:8}}><TextInput value={word} onChangeText={setWord} placeholder="Add new vocabulary..." style={{flex:1,backgroundColor:light,borderRadius:12,padding:14}}/><Btn label="Add" onPress={addWord}/></View><Txt color={muted} size={13} style={{marginTop:12}}>{vocab.length} words saved</Txt>{vocab.map(v=><Txt key={v.id} style={{padding:7}}>📖 {v.word}</Txt>)}</Section><Section title="AI practice (coming soon)"><View style={{backgroundColor:light,padding:18,borderRadius:14}}><Txt>🤖 Practice a conversation about planning a trip.</Txt><Txt size={12} color={muted} style={{marginTop:6}}>Real AI voice feedback will require an additional service.</Txt></View></Section><Btn label="Update my level" outline onPress={()=>setScreen('level')}/></ScrollView>}
{!['onboard','level'].includes(screen)&&<View style={{flexDirection:'row',borderTopWidth:1,borderColor:'#eef0f4',paddingVertical:11}}>{tabItems.map(([id,icon,label])=><TouchableOpacity key={id} onPress={()=>setScreen(id)} style={{flex:1,alignItems:'center',gap:4}}><Ionicons name={icon} size={21} color={screen===id?orange:'#98a3b3'}/><Txt size={10} color={screen===id?orange:muted}>{label}</Txt></TouchableOpacity>)}</View>}
</SafeAreaView>}
=======
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
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
  primary: '#FF6B35',
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
  try {
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: text || `HTTP ${response.status} ${response.statusText}` };
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

const Section = ({ title, children }) => (
  <View style={{ marginBottom: 22 }}>
    <Txt size={16} bold style={{ marginBottom: 12 }}>{title}</Txt>
    {children}
  </View>
);

function App() {
  const [screen, setScreen] = useState('welcome');
  const [sessionChecking, setSessionChecking] = useState(true);
  const [userId, setUserId] = useState('u1');
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
        const [p, r, v] = await Promise.all([
          request('partners'),
          request('rooms'),
          request(`vocabulary/${userId}`).catch(() => []),
        ]);
        setPartners(p);
        setRooms(r);
        setVocab(v);
      }
    } catch {
      setBackendUp(false);
    }
  };

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

    const socket = io(API, { transports: ['websocket', 'polling'] });
    socket.on('message:new', (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    socket.on('rooms:changed', setRooms);
    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (screen === 'chat') {
      request(`messages/${userId}/${selected.id}`)
        .then(setMessages)
        .catch(() => setMessages([]));
    }
  }, [selected, screen, userId]);

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
        if (res.user.id) setUserId(res.user.id);
        if (res.user.name) setName(res.user.name);
        if (res.user.country) setCountry(res.user.country);
        if (res.user.nativeLanguage) setNativeLanguage(res.user.nativeLanguage);
        if (res.user.learningLanguage) setLearningLanguage(res.user.learningLanguage);
        if (res.user.level) setLevel(res.user.level);
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
    await clearSession();
    setUserId('u1');
    setName('Pavan Nerkar');
    setScreen('welcome');
  };

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
        body: JSON.stringify({ from: userId, to: selected.id, text }),
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
        body: JSON.stringify({ userId, word, category: 'Conversation' }),
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

  if (sessionChecking) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={{ alignItems: 'center' }}>
          <Image source={require('./assets/logo_icon.png')} style={{ width: 44, height: 44, marginBottom: 14 }} resizeMode="contain" />
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
                <Image source={require('./assets/logo_icon.png')} style={{ width: 22, height: 22, marginRight: 6 }} resizeMode="contain" />
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

          {/* SCREEN 1: WELCOME SCREEN */}
          {screen === 'welcome' && (
            <ScrollView
              contentContainerStyle={styles.welcomeScrollContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Brand Header */}
              <View style={styles.welcomeHeader}>
                <View style={styles.brandRow}>
                  <Image
                    source={require('./assets/logo_icon.png')}
                    style={styles.logoIconLarge}
                    resizeMode="contain"
                  />
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
              <View style={styles.heroIllustrationContainer}>
                <Image
                  source={require('./assets/hero_illustration.png')}
                  style={styles.heroIllustrationImage}
                  resizeMode="contain"
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
                <Image
                  source={require('./assets/logo_icon.png')}
                  style={styles.authLogoIcon}
                  resizeMode="contain"
                />
                <Text style={styles.authBrandTitle}>
                  BY<Text style={{ color: COLORS.primary }}>TALK</Text>
                </Text>
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

                {/* Bottom Link to Registration */}
                <View style={styles.footerLinkRow}>
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
                <Image
                  source={require('./assets/logo_icon.png')}
                  style={styles.authLogoIcon}
                  resizeMode="contain"
                />
                <Text style={styles.authBrandTitle}>
                  BY<Text style={{ color: COLORS.primary }}>TALK</Text>
                </Text>
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

                {/* Bottom Link to Login */}
                <View style={styles.footerLinkRow}>
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
              <Field label="My native language" value={nativeLanguage} setValue={setNativeLanguage} placeholder="e.g. English" />
              <Field label="I want to learn" value={learningLanguage} setValue={setLearningLanguage} placeholder="e.g. Spanish" />
              <Field label="I am from" value={country} setValue={setCountry} placeholder="e.g. United States" />
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
                        <Txt size={11} color={COLORS.primary} style={{ marginTop: 2, fontWeight: '600' }}>
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

          {/* SCREEN 7: CHAT */}
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

          {/* SCREEN 8: LIVE SPEAKING ROOMS */}
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
              <Btn label="Update my level" outline onPress={() => setScreen('level')} style={{ marginBottom: 12 }} />
              <Btn label="Log Out / Sign Out" outline onPress={handleLogout} style={{ marginBottom: 12 }} />
              <Btn label="Back to Welcome Screen" outline onPress={() => setScreen('welcome')} />
            </ScrollView>
          )}

          {/* BOTTOM TAB BAR (ONLY ON MAIN LOGGED-IN SCREENS) */}
          {!['welcome', 'login', 'register', 'onboard', 'level'].includes(screen) && (
            <View style={styles.tabBar}>
              {tabItems.map(([id, icon, label]) => (
                <TouchableOpacity key={id} onPress={() => setScreen(id)} style={styles.tabItem}>
                  <Ionicons name={icon} size={22} color={screen === id ? orange : '#98a3b3'} />
                  <Txt size={10} color={screen === id ? orange : muted} bold={screen === id}>{label}</Txt>
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
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSubText: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textSecondary,
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
    paddingTop: 12,
    paddingBottom: 28,
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
    marginBottom: 16,
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
  },
  authBrandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.8,
  },
  authHeadingBlock: {
    marginBottom: 20,
  },
  authHeadingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  authHeadingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 20,
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
    marginBottom: 16,
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
    backgroundColor: '#F8FAFC',
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

>>>>>>> Stashed changes
export default App;
