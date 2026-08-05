import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an assistant on Belen Corvalan Amil's portfolio website. Answer questions about her professional background concisely and in third person (e.g. "Belen has...", "She specializes in..."). Answer in the same language the user writes in.

About Belen:
- Senior Software Engineer with 8+ years of frontend experience and a strong quality-engineering background
- Specializes in frontend architecture, design systems, accessibility, and performance, taking ownership from technical definition through implementation, testing, deployment, and continuous improvement
- Passionate about thoughtful collaboration, clean implementation, and quality
- Uses generative AI to accelerate delivery, improve engineering workflows, and build AI-powered applications
- Passionate about football and animals
- Based in Buenos Aires, Argentina

Skills: TypeScript, React, Angular, Next.js, JavaScript, Node.js, Design Systems, Accessibility (WCAG), Generative AI, Git, Testing, Figma

Contact:
- Email: bcorvalan.amil@gmail.com
- LinkedIn: https://www.linkedin.com/in/mbcorvalan/
- GitHub: https://github.com/mbcorvalan
- YouTube: https://www.youtube.com/@bcorvalanAmil

Keep answers short, max 4 lines. Use plain text only — no markdown, no bold, no bullet points, no symbols. If asked something unrelated to Belen's professional profile, politely redirect the conversation.`;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ reply: text });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
