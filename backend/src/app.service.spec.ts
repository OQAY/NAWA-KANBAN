import { AppService } from './app.service';

describe('AppService - Testes Reais', () => {
  let service: AppService;

  beforeEach(() => {
    // SEM MOCK - instancia o serviço real
    service = new AppService();
  });

  describe('getHello', () => {
    it('deve retornar mensagem específica da API', () => {
      const resultado = service.getHello();
      
      // Testa o VALOR REAL que o método retorna
      expect(resultado).toBe('Kanban API is running!');
    });

    it('deve retornar string não vazia', () => {
      const resultado = service.getHello();
      
      // Testa TIPO e estrutura real
      expect(typeof resultado).toBe('string');
      expect(resultado.length).toBeGreaterThan(0);
    });

    it('deve conter palavra "Kanban" na mensagem', () => {
      const resultado = service.getHello();
      
      // Testa conteúdo específico real
      expect(resultado).toContain('Kanban');
      expect(resultado).toContain('API');
    });
  });
});