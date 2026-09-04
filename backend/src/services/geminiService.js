import { env } from '../config/env.js';

export async function enhanceRecommendationSummary(city, recommendations) {
  if (!env.geminiApiKey || recommendations.length === 0) return null;

  const prompt = `You are an urban planning analyst. Summarize these computed priorities for ${city.name} in 2 concise sentences. Do not invent data. Return plain text only.\n${JSON.stringify(recommendations.slice(0, 5))}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 160 } }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error(`Gemini request failed with ${response.status}`);
  const body = await response.json();
  return body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

