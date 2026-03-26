import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ASSISTANT_SYSTEM_PROMPT } from './prompts/assistant.prompt';
import { AiResponse, AiAction } from './dto/ai-response.dto';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface SessionEntry {
  history: { role: string; parts: { text: string }[] }[];
  createdAt: number;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private sessions = new Map<string, SessionEntry>();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured — AI features disabled');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    // F5: Periodic cleanup of stale sessions
    setInterval(() => this.cleanupSessions(), SESSION_TTL_MS);

    this.logger.log('Gemini AI initialized successfully');
  }

  async chat(
    userId: string,
    message: string,
    boardContext: string,
  ): Promise<AiResponse> {
    if (!this.model) {
      return {
        text: 'AI não está configurada. Verifique a GEMINI_API_KEY no .env.',
      };
    }

    try {
      // F8: Always use fresh board context by creating new session with history
      const session = this.getOrCreateSession(userId);

      const chatSession = this.model.startChat({
        history: session.history,
        systemInstruction: {
          role: 'user',
          parts: [{ text: ASSISTANT_SYSTEM_PROMPT + boardContext }],
        },
      });

      const result = await chatSession.sendMessage(message);
      const responseText = result.response.text();

      // Keep conversation history (capped to prevent memory growth)
      session.history.push(
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text: responseText }] },
      );

      // F5: Cap history to last 20 exchanges (40 entries)
      if (session.history.length > 40) {
        session.history = session.history.slice(-40);
      }

      const { text, actions } = this.parseResponse(responseText);
      return { text, actions };
    } catch (error) {
      this.logger.error(`Gemini API error: ${error.message}`);
      return {
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
      };
    }
  }

  resetSession(userId: string): void {
    this.sessions.delete(userId);
  }

  private getOrCreateSession(userId: string): SessionEntry {
    let session = this.sessions.get(userId);
    if (!session) {
      session = { history: [], createdAt: Date.now() };
      this.sessions.set(userId, session);
    }
    return session;
  }

  private cleanupSessions(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        this.sessions.delete(userId);
      }
    }
  }

  private parseResponse(responseText: string): AiResponse {
    const actionsRegex = /```actions\s*\n([\s\S]*?)\n```/;
    const match = responseText.match(actionsRegex);

    let text = responseText;
    let actions: AiAction[] | undefined;

    if (match) {
      text = responseText.replace(actionsRegex, '').trim();

      try {
        actions = JSON.parse(match[1]);
      } catch {
        this.logger.warn('Failed to parse AI actions JSON');
      }
    }

    return { text, actions };
  }
}
