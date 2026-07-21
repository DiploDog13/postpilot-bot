import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const stylePrompts: Record<string, string> = {
  professional: 'You are a professional content writer. Transform the input into a polished, professional post suitable for LinkedIn or a business blog. Keep it concise, insightful, and well-structured.',
  viral: 'You are a viral content creator. Transform the input into an engaging, shareable post with a hook, emotional appeal, and call-to-action. Use emojis and make it memorable.',
  funny: 'You are a comedy writer. Transform the input into a humorous, entertaining post. Use wit, wordplay, and relatable humor.',
  sales: 'You are a copywriter. Transform the input into a persuasive sales post with a strong value proposition, benefits, and clear call-to-action.',
  educational: 'You are an educator. Transform the input into an informative, easy-to-understand post that teaches something valuable. Use clear explanations and examples.',
};

export async function generatePost(
  input: string,
  style: string,
  brandVoiceExamples?: string[]
): Promise<string> {
  const systemPrompt = stylePrompts[style] || stylePrompts.professional;
  
  let messages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (brandVoiceExamples && brandVoiceExamples.length > 0) {
    const examplesText = brandVoiceExamples.join('\n\n');
    messages.push({
      role: 'system',
      content: `Here are examples of the user's writing style:\n${examplesText}\n\nMatch this style in your response.`,
    });
  }

  messages.push({ role: 'user', content: input });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0].message.content || 'Failed to generate post';
}

export async function transcribeVoice(audioBuffer: Buffer): Promise<string> {
  const file = new File([audioBuffer], 'voice.ogg', { type: 'audio/ogg' });
  
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });

  return transcription.text;
}

export async function generateFromUrl(url: string, style: string): Promise<string> {
  const systemPrompt = stylePrompts[style] || stylePrompts.professional;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Create a social media post based on this URL: ${url}` },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return completion.choices[0].message.content || 'Failed to generate post';
}
