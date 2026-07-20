import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type PostStyle = 'professional' | 'viral' | 'funny' | 'sales' | 'educational';

export async function generatePost(
  inputText: string,
  style: PostStyle,
  brandVoiceExamples?: string[]
): Promise<string> {
  const stylePrompts: Record<PostStyle, string> = {
    professional: 'Write in a professional, authoritative tone. Use clear language and avoid slang.',
    viral: 'Write in an engaging, viral style. Use hooks, questions, and create FOMO. Make it shareable.',
    funny: 'Write in a humorous, entertaining tone. Use wit and light-hearted humor.',
    sales: 'Write in a persuasive sales tone. Focus on benefits, use urgency, and include a clear CTA.',
    educational: 'Write in an informative, teaching tone. Explain concepts clearly and provide value.',
  };

  const systemPrompt = `
You are a Telegram content expert. Generate a single, publication-ready Telegram post.

Style: ${style}
${stylePrompts[style]}
${brandVoiceExamples ? `Learn from these examples of the creator's voice:\n${brandVoiceExamples.join('\n')}` : ''}

Requirements:
- Keep it under 250 characters
- Use emojis sparingly (1-2 max)
- Make it engaging and authentic
- Reply with ONLY the post text, nothing else
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: inputText },
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    return response.choices[0].message.content || 'Failed to generate post';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate post');
  }
}

export async function transcribeVoice(fileId: string, botToken: string): Promise<string> {
  try {
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileId}`;
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch voice file');
    }
    
    const audioBuffer = await response.arrayBuffer();
    const audioFile = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

    const transcript = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
    });

    return transcript.text;
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error('Failed to transcribe voice note');
  }
}

export async function generateFromUrl(url: string, style: PostStyle): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch URL content');
    }
    
    const text = await response.text();
    const cleanedText = text.replace(/<[^>]*>/g, '').substring(0, 2000);
    
    return generatePost(cleanedText, style);
  } catch (error) {
    console.error('URL fetch error:', error);
    throw new Error('Failed to generate post from URL');
  }
}
