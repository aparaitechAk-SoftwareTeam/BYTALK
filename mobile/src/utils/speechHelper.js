// Audio & Speech Synthesis Helper for BYTALK
// Supports Web Speech API (Chrome, Safari, Edge, Android WebView, iOS WKWebView)
// with graceful fallback for all environments and multi-language support.

export const LANGUAGE_LOCALES = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Spanish: 'es-ES',
  French: 'fr-FR',
  Japanese: 'ja-JP',
  'Mandarin Chinese': 'zh-CN',
  Arabic: 'ar-SA',
  German: 'de-DE',
  Portuguese: 'pt-BR',
  Bengali: 'bn-IN',
  Russian: 'ru-RU',
  Urdu: 'ur-PK',
  Indonesian: 'id-ID',
  Korean: 'ko-KR',
  Italian: 'it-IT',
  Turkish: 'tr-TR',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Vietnamese: 'vi-VN',
  Polish: 'pl-PL',
  Dutch: 'nl-NL',
  Greek: 'el-GR',
  Hebrew: 'he-IL',
  Thai: 'th-TH',
  Swedish: 'sv-SE',
  Czech: 'cs-CZ',
  Hungarian: 'hu-HU',
  Romanian: 'ro-RO',
  Danish: 'da-DK',
  Finnish: 'fi-FI',
  Norwegian: 'nb-NO',
  Swahili: 'sw-KE',
  Malay: 'ms-MY',
  Ukrainian: 'uk-UA',
};

let activeUtterance = null;

export const speakText = (text, language = 'English', onStart, onEnd, options = {}) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\[.*?\]/g, '').trim();
      if (!cleanText) return false;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const targetLocale = LANGUAGE_LOCALES[language] || 'en-US';
      utterance.lang = targetLocale;

      // Rate adjustments based on settings
      let rate = 0.95;
      if (options.speed === '0.75x') rate = 0.75;
      else if (options.speed === '1.25x') rate = 1.25;
      else if (options.speed === '1x') rate = 1.0;
      utterance.rate = rate;
      utterance.pitch = options.gender === 'MALE' ? 0.9 : 1.1;

      // Try to find a matching voice if voices are loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const langPrefix = targetLocale.split('-')[0].toLowerCase();
        const preferredGender = (options.gender || 'FEMALE').toLowerCase();
        const matchedVoice = voices.find(
          (v) => (v.lang.toLowerCase().startsWith(langPrefix) || v.lang.toLowerCase().includes(langPrefix)) &&
                 (preferredGender === 'male' ? v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') : v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'))
        ) || voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix))
          || voices.find((v) => v.lang.toLowerCase().includes(langPrefix));
        if (matchedVoice) utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        activeUtterance = utterance;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        activeUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        activeUtterance = null;
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

// Backward-compatible alias
export const speakEnglish = (text, onStart, onEnd) => {
  return speakText(text, 'English', onStart, onEnd);
};

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      activeUtterance = null;
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
};

export const isSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
};
