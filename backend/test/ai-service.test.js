import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemInstruction, generateAiResponse, AI_TOPIC_GUIDANCE, LANGUAGE_LOCALES } from '../src/aiService.js';

test('buildSystemInstruction incorporates target language, level, and topic', () => {
  const instruction = buildSystemInstruction({
    topic: 'Education',
    language: 'French',
    proficiencyLevel: 'Beginner'
  });

  assert.ok(instruction.includes('BYTALK AI'), 'Includes AI identity');
  assert.ok(instruction.includes('French'), 'Includes target language French');
  assert.ok(instruction.includes('Beginner'), 'Includes target level Beginner');
  assert.ok(instruction.includes('Education'), 'Includes topic Education');
  assert.ok(instruction.includes('Ask only one question at a time'), 'Includes single question rule');
});

test('buildSystemInstruction supports all standard practice topics', () => {
  const topics = ['Education', 'Travel', 'Culture', 'Work & Career', 'Hobbies', 'Movies & Music', 'Technology', 'Daily Life', 'All Topics'];
  topics.forEach((topic) => {
    const instruction = buildSystemInstruction({ topic, language: 'Spanish', proficiencyLevel: 'Intermediate' });
    assert.ok(instruction.includes(topic), `Instruction includes topic ${topic}`);
    assert.ok(instruction.includes('Spanish'), 'Instruction includes language');
  });
});

test('LANGUAGE_LOCALES maps common languages accurately', () => {
  assert.equal(LANGUAGE_LOCALES.English, 'en-US');
  assert.equal(LANGUAGE_LOCALES.French, 'fr-FR');
  assert.equal(LANGUAGE_LOCALES.Spanish, 'es-ES');
  assert.equal(LANGUAGE_LOCALES.Hindi, 'hi-IN');
  assert.equal(LANGUAGE_LOCALES.Japanese, 'ja-JP');
  assert.equal(LANGUAGE_LOCALES.German, 'de-DE');
});

test('generateAiResponse throws ai_provider_unavailable when no key is set', async () => {
  const origGemini = process.env.GEMINI_API_KEY;
  const origGoogle = process.env.GOOGLE_API_KEY;
  const origOpenAi = process.env.OPENAI_API_KEY;

  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    await assert.rejects(
      async () => {
        await generateAiResponse({
          topic: 'Education',
          language: 'English',
          proficiencyLevel: 'Beginner',
          messages: []
        });
      },
      (err) => {
        assert.equal(err.code, 'ai_provider_unavailable');
        assert.ok(err.message.includes('GEMINI_API_KEY'), 'Explains GEMINI_API_KEY is needed');
        return true;
      }
    );
  } finally {
    if (origGemini !== undefined) process.env.GEMINI_API_KEY = origGemini;
    if (origGoogle !== undefined) process.env.GOOGLE_API_KEY = origGoogle;
    if (origOpenAi !== undefined) process.env.OPENAI_API_KEY = origOpenAi;
  }
});

