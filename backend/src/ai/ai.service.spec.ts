import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GEMINI_API_KEY') return undefined; // No API key in tests
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should warn when GEMINI_API_KEY is not configured', () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn');
      service.onModuleInit();
      expect(warnSpy).toHaveBeenCalledWith(
        'GEMINI_API_KEY not configured — AI features disabled',
      );
    });
  });

  describe('chat', () => {
    it('should return error message when model is not initialized', async () => {
      service.onModuleInit(); // No API key, model stays null

      const result = await service.chat('user-1', 'hello', '');
      expect(result.text).toContain('AI não está configurada');
      expect(result.actions).toBeUndefined();
    });
  });

  describe('resetSession', () => {
    it('should remove session for user', () => {
      (service as any).sessions.set('user-1', { history: [], createdAt: Date.now() });
      service.resetSession('user-1');
      expect((service as any).sessions.has('user-1')).toBe(false);
    });

    it('should handle non-existent sessions gracefully', () => {
      expect(() => service.resetSession('non-existent')).not.toThrow();
    });
  });

  describe('parseResponse', () => {
    it('should extract actions from response text', () => {
      const text = `Pronto, criei a task!

\`\`\`actions
[{"action": "create_task", "params": {"title": "Test", "status": "pending"}}]
\`\`\``;

      const result = (service as any).parseResponse(text);
      expect(result.text).toBe('Pronto, criei a task!');
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].action).toBe('create_task');
    });

    it('should return text as-is when no actions block', () => {
      const text = 'O board tem 5 tasks pendentes.';
      const result = (service as any).parseResponse(text);
      expect(result.text).toBe(text);
      expect(result.actions).toBeUndefined();
    });

    it('should handle malformed JSON in actions block', () => {
      const text = 'Resultado:\n```actions\n{invalid json}\n```';
      const result = (service as any).parseResponse(text);
      expect(result.text).toBe('Resultado:');
      expect(result.actions).toBeUndefined();
    });
  });
});
