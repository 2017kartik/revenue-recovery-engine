import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(customerName: string, amount: number, failureReason: string): string {
  return (
    `You are a helpful customer support agent for a fintech company. ` +
    `A customer named ${customerName} had a payment of $${amount} fail due to '${failureReason}'.\n\n` +
    `Your task is to write a polite, concise, single-sentence SMS recovery message for this customer.\n\n` +
    `You MUST respond using EXACTLY this XML format and nothing else:\n` +
    `<reasoning>Your step-by-step reasoning goes here.</reasoning>\n` +
    `<sms>The exact SMS message to send goes here.</sms>`
  );
}

// ─── Primary: Groq (llama-3.3-70b-versatile) ──────────────────────────────────

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const groq = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const completion = await groq.chat.completions.create({
    model: 'groq/compound',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 120,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned an empty response');
  return text;
}

// ─── Fallback: Gemini (gemini-2.0-flash) ─────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

// ─── Public Router ────────────────────────────────────────────────────────────

/**
 * Generates a recovery SMS using Groq as primary LLM.
 * If Groq fails for any reason (rate limit, auth, network), the identical prompt
 * is immediately retried against the Gemini API.
 *
 * @returns { prompt, smsResponse, model } — model indicates which LLM was used
 */
export async function generateRecoverySMS(
  customerName: string,
  amount: number,
  failureReason: string
): Promise<{ prompt: string; smsResponse: string; model: string }> {
  const prompt = buildPrompt(customerName, amount, failureReason);

  // ── Attempt 1: Groq ────────────────────────────────────────────────────────
  try {
    const smsResponse = await callGroq(prompt);
    console.log(`✓ [Groq]   Generated SMS for ${customerName}`);
    return { prompt, smsResponse, model: 'groq/llama-3.3-70b-versatile' };
  } catch (groqError) {
    console.warn(`⚠ [Groq]   Failed — falling back to Gemini:`, (groqError as Error).message);
  }

  // ── Attempt 2: Gemini (fallback) ───────────────────────────────────────────
  try {
    const smsResponse = await callGemini(prompt);
    console.log(`✓ [Gemini] Generated SMS for ${customerName} (fallback)`);
    return { prompt, smsResponse, model: 'google/gemini-2.0-flash' };
  } catch (geminiError) {
    console.error(`✗ [Gemini] Fallback also failed:`, (geminiError as Error).message);
    // Both providers failed — propagate so BullMQ can retry with backoff
    throw geminiError;
  }
}