// BYTALK AI Partner Service
// Real AI provider integration powered by Google Gemini (with OpenAI fallback)

export const AI_TOPIC_GUIDANCE = {
  'All Topics': 'Choose an engaging, everyday conversation topic to help the user practice.',
  'All': 'Choose an engaging, everyday conversation topic to help the user practice.',
  'Education': 'Ask about school, college, exams, subjects, learning goals, and career aspirations.',
  'Travel': 'Ask about favorite travel destinations, holidays, memorable trips, cultures visited, and dream vacations.',
  'Culture': 'Discuss festivals, traditions, food, customs, music, and cultural heritage around the world.',
  'Work & Career': 'Discuss jobs, career paths, interviews, professional skills, workplace experiences, and future goals.',
  'Hobbies': 'Discuss personal interests, sports, creative arts, outdoor activities, reading, and free-time passions.',
  'Movies & Music': 'Discuss favorite movies, TV series, music genres, favorite bands, actors, and recent recommendations.',
  'Technology': 'Discuss programming, AI, gadgets, smartphones, software, internet trends, and the future of tech.',
  'Daily Life': 'Discuss daily routines, family, friends, morning habits, cooking, hobbies, and everyday experiences.',
};

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

/**
 * Builds the required system prompt enforcing the BYTALK AI personality,
 * target learning language, proficiency level, and conversational guidelines.
 */
export function buildSystemInstruction({ topic, language, proficiencyLevel }) {
  const chosenTopic = topic || 'All Topics';
  const chosenLanguage = language || 'English';
  const chosenLevel = proficiencyLevel || 'Beginner';
  const guidance = AI_TOPIC_GUIDANCE[chosenTopic] || AI_TOPIC_GUIDANCE['All Topics'];

  return `You are BYTALK AI, a friendly and patient language-speaking partner.

Your purpose is to help users improve their speaking and communication skills.

You must:
- Speak in the user's selected learning language: ${chosenLanguage}.
- Follow the user's selected proficiency level: ${chosenLevel}. (Adjust vocabulary and grammar difficulty to this level. For Beginner, use simple words and brief sentences. For Intermediate, use everyday natural language. For Advanced or Proficient, speak fluently with natural idioms and nuance).
- Start with a friendly greeting in ${chosenLanguage}.
- Ask only one question at a time.
- Keep the conversation natural and interesting.
- Focus on the selected conversation topic: ${chosenTopic}. (${guidance})
- Give helpful responses.
- Correct grammar mistakes politely.
- Explain corrections in simple language.
- Encourage the user to continue speaking.
- Ask relevant follow-up questions.
- Avoid repeating questions.
- Do not give unnecessarily long answers. Keep replies conversational (2 to 4 sentences).
- Behave like a real conversation partner, not a formal teacher.

If the user makes a language mistake, explain the correct sentence and continue the conversation naturally in ${chosenLanguage}.`;
}

/**
 * Calls the Google Gemini generateContent API.
 */
async function callGeminiApi({ systemInstruction, messages, topic, language, level }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey === 'your_api_key_here') {
    return null;
  }

  // Fast, responsive candidates for real-time conversation
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const candidateModels = [
    preferredModel,
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Format messages into Gemini contents array
  const contents = [];

  if (!messages || messages.length === 0) {
    contents.push({
      role: 'user',
      parts: [{
        text: `Hello! I want to practice speaking ${language} at a ${level} level. My topic is "${topic}". Please greet me warmly as BYTALK AI and ask your first question to begin our conversation.`
      }]
    });
  } else {
    // Keep the most recent 12 messages for memory management
    const recent = messages.slice(-12);
    let lastRole = null;

    for (const msg of recent) {
      const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
      const text = (msg.content || msg.text || '').trim();
      if (!text) continue;

      if (contents.length === 0 && role === 'model') {
        contents.push({
          role: 'user',
          parts: [{ text: `Hello! Let's practice speaking ${language} about "${topic}".` }]
        });
      }

      if (role === lastRole) {
        contents[contents.length - 1].parts[0].text += `\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
        lastRole = role;
      }
    }

    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: `Hello! Let's practice speaking ${language} about "${topic}".` }]
      });
    }
  }

  let lastError = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 350,
            topP: 0.9,
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 404 && candidateModels.indexOf(model) < candidateModels.length - 1) {
          console.warn(`[BYTALK AI] Model ${model} returned 404, falling back to next model.`);
          continue;
        }

        const errMsg = data?.error?.message || `Gemini API responded with status ${response.status}`;
        const err = new Error(errMsg);
        err.status = response.status === 429 ? 429 : 502;
        err.code = response.status === 429 ? 'ai_rate_limited' : 'ai_provider_error';
        throw err;
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!reply) {
        throw new Error('Gemini API returned an empty response. Please try again.');
      }

      return reply;
    } catch (err) {
      lastError = err;
      if (err.code === 'ai_provider_error' && candidateModels.indexOf(model) < candidateModels.length - 1) {
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError) throw lastError;
  return null;
}

/**
 * Fallback to OpenAI API if OPENAI_API_KEY is configured.
 */
async function callOpenAiApi({ systemInstruction, messages, topic, language, level }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;

  const url = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const chatMessages = [
    { role: 'system', content: systemInstruction }
  ];

  if (!messages || messages.length === 0) {
    chatMessages.push({
      role: 'user',
      content: `Hello! I want to practice speaking ${language} at a ${level} level on the topic "${topic}". Please greet me warmly as BYTALK AI and ask your first question.`
    });
  } else {
    for (const msg of messages.slice(-12)) {
      chatMessages.push({
        role: msg.role === 'model' ? 'assistant' : (msg.role || 'user'),
        content: msg.content || msg.text || ''
      });
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 350,
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data?.error?.message || `OpenAI API responded with status ${response.status}`;
      const err = new Error(errMsg);
      err.status = response.status === 429 ? 429 : 502;
      err.code = response.status === 429 ? 'ai_rate_limited' : 'ai_provider_error';
      throw err;
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('OpenAI returned an empty response.');
    return text;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('AI conversation request timed out.');
      timeoutErr.status = 504;
      timeoutErr.code = 'ai_timeout';
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main AI response generator.
 * Tries Google Gemini first, falls back to OpenAI if configured,
 * or throws an actionable error explaining that GEMINI_API_KEY is required.
 */
export async function generateAiResponse({ topic, language, proficiencyLevel, messages }) {
  const chosenTopic = topic || 'All Topics';
  const chosenLanguage = language || 'English';
  const chosenLevel = proficiencyLevel || 'Beginner';

  const systemInstruction = buildSystemInstruction({
    topic: chosenTopic,
    language: chosenLanguage,
    proficiencyLevel: chosenLevel
  });

  // 1. Try Google Gemini
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    const reply = await callGeminiApi({
      systemInstruction,
      messages,
      topic: chosenTopic,
      language: chosenLanguage,
      level: chosenLevel
    });
    if (reply) return reply;
  }

  // 2. Try OpenAI fallback if configured
  if (process.env.OPENAI_API_KEY) {
    const reply = await callOpenAiApi({
      systemInstruction,
      messages,
      topic: chosenTopic,
      language: chosenLanguage,
      level: chosenLevel
    });
    if (reply) return reply;
  }

  // 3. No real AI provider configured
  const error = new Error('GEMINI_API_KEY is not configured on the backend. Please add your GEMINI_API_KEY to backend/.env to start real conversations with BYTALK AI Partner.');
  error.code = 'ai_provider_unavailable';
  error.status = 503;
  throw error;
}
