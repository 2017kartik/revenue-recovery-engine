import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateRecoverySMS(customerName: string, amount: number, failureReason: string): Promise<string> {
  try {
    const prompt = `Act as a helpful support agent. Write a polite, concise, single-sentence SMS to a customer named ${customerName} about their failed payment of $${amount} due to '${failureReason}'.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    return response.text || `Hi ${customerName}, your recent payment of $${amount} failed. Please update your payment method.`;
  } catch (error) {
    console.error('Error generating AI recovery SMS:', error);
    return `Hi ${customerName}, your recent payment of $${amount} failed. Please update your payment method.`;
  }
}
