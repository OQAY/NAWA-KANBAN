// Função REAL copiada do kanban.component.ts
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'agora mesmo';
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  } else if (diffDays < 30) {
    return `há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

describe('Time Utils - Testes Reais', () => {
  
  describe('getTimeAgo', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    
    // Mock Date.now para tornar testes determinísticos
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });
    
    afterAll(() => {
      jest.useRealTimers();
    });

    it('deve retornar "agora mesmo" para data atual', () => {
      const result = getTimeAgo(new Date(now.getTime() - 30000)); // 30 segundos atrás
      
      expect(result).toBe('agora mesmo');
    });

    it('deve calcular minutos corretamente', () => {
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
      
      expect(getTimeAgo(fiveMinutesAgo)).toBe('há 5 minutos');
      expect(getTimeAgo(oneMinuteAgo)).toBe('há 1 minuto'); // singular
    });

    it('deve calcular horas corretamente', () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      
      expect(getTimeAgo(twoHoursAgo)).toBe('há 2 horas');
      expect(getTimeAgo(oneHourAgo)).toBe('há 1 hora'); // singular
    });

    it('deve calcular dias corretamente', () => {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      
      expect(getTimeAgo(threeDaysAgo)).toBe('há 3 dias');
      expect(getTimeAgo(oneDayAgo)).toBe('há 1 dia'); // singular
    });

    it('deve formatar data completa para mais de 30 dias', () => {
      const oldDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
      
      const result = getTimeAgo(oldDate);
      
      // Testa se contém elementos esperados da formatação brasileira
      expect(result).toContain('dez'); // mês em português
      expect(result).toContain('2023'); // ano
      expect(result).toMatch(/\d{2}:\d{2}/); // hora:minuto
    });

    it('deve tratar corretamente plurais em português', () => {
      // Casos de plural
      expect(getTimeAgo(new Date(now.getTime() - 2 * 60 * 1000))).toContain('minutos');
      expect(getTimeAgo(new Date(now.getTime() - 3 * 60 * 60 * 1000))).toContain('horas');
      expect(getTimeAgo(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000))).toContain('dias');
      
      // Casos de singular
      expect(getTimeAgo(new Date(now.getTime() - 1 * 60 * 1000))).toContain('minuto');
      expect(getTimeAgo(new Date(now.getTime() - 1 * 60 * 60 * 1000))).toContain('hora');
      expect(getTimeAgo(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000))).toContain('dia');
    });

    it('deve funcionar com datas futuras (retorna negativo)', () => {
      const futureDate = new Date(now.getTime() + 2 * 60 * 1000);
      
      // A função não foi projetada para futuro, mas vamos testar comportamento real
      const result = getTimeAgo(futureDate);
      
      expect(result).toBe('agora mesmo'); // Porque diffMinutes será negativo < 1
    });
  });
});