import Groq from 'groq-sdk';
import { config } from '../config';

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    if (!config.groqApiKey) {
      throw new Error('GROQ_API_KEY not configured');
    }
    groqClient = new Groq({ apiKey: config.groqApiKey });
  }
  return groqClient;
}

export const GROQ_MODEL = config.groqModel;
