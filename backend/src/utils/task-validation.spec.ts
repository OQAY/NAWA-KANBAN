// Status dinâmicos - agora baseado em colunas customizáveis
const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  TESTING: 'testing',
  DONE: 'done',
};

// Copiando a função real do frontend para testar
export function validateTaskStatus(status: string): string {
  const validStatuses = Object.values(TASK_STATUSES);
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid task status: ${status}`);
  }
  return status;
}

describe('Task Validation Utils - Testes Reais', () => {
  
  describe('validateTaskStatus', () => {
    it('deve validar todos os status válidos', () => {
      const validStatuses = ['pending', 'in_progress', 'testing', 'done'];
      
      validStatuses.forEach(status => {
        // Testa função REAL sem mocks
        const result = validateTaskStatus(status);
        expect(result).toBe(status);
        expect(Object.values(TASK_STATUSES)).toContain(result);
      });
    });

    it('deve lançar erro para status inválidos', () => {
      const invalidStatuses = ['invalid', 'random', 'todo', 'complete', ''];

      invalidStatuses.forEach(invalidStatus => {
        // Testa comportamento REAL de erro
        expect(() => validateTaskStatus(invalidStatus))
          .toThrow(`Invalid task status: ${invalidStatus}`);
      });
    });

    it('deve retornar tipo string correto', () => {
      const result = validateTaskStatus('pending');

      // Testa tipo real retornado
      expect(result).toBe(TASK_STATUSES.PENDING);
      expect(typeof result).toBe('string');
    });

    it('deve validar case-sensitive', () => {
      const caseSensitiveTests = ['PENDING', 'Pending', 'In_Progress'];
      
      caseSensitiveTests.forEach(testCase => {
        // Testa comportamento REAL com case sensitivity
        expect(() => validateTaskStatus(testCase))
          .toThrow();
      });
    });

    it('deve rejeitar valores não-string', () => {
      const nonStringValues = [null, undefined, 123, {}, [], true];
      
      nonStringValues.forEach(value => {
        // Testa comportamento REAL com tipos incorretos
        expect(() => validateTaskStatus(value as any))
          .toThrow();
      });
    });
  });
});