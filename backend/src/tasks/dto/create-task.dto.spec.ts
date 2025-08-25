import { validate } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';
import { TaskStatus } from '../../database/entities/task.entity';

describe('CreateTaskDto - Testes de Validação Reais', () => {

  describe('Validações obrigatórias', () => {
    it('deve falhar quando title não é string', async () => {
      const dto = new CreateTaskDto();
      (dto as any).title = 123; // Força um número
      dto.projectId = '123e4567-e89b-12d3-a456-426614174000'; // UUID válido

      const errors = await validate(dto);
      
      // Testa VALIDAÇÃO REAL do class-validator
      expect(errors.length).toBeGreaterThan(0);
      
      // Encontra o erro específico do title
      const titleError = errors.find(e => e.property === 'title');
      expect(titleError).toBeDefined();
      expect(titleError.constraints).toHaveProperty('isString');
    });

    it('deve falhar quando projectId não é UUID válido', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Task válida';
      dto.projectId = 'not-a-uuid';

      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
      const projectIdError = errors.find(e => e.property === 'projectId');
      expect(projectIdError).toBeDefined();
      expect(projectIdError.constraints).toHaveProperty('isUuid');
    });

    it('deve passar com dados mínimos válidos', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Task válida';
      dto.projectId = '123e4567-e89b-12d3-a456-426614174000'; // UUID v4 válido

      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('Validações opcionais', () => {
    it('deve aceitar priority entre 0 e 3', async () => {
      const validPriorities = [0, 1, 2, 3];
      
      for (const priority of validPriorities) {
        const dto = new CreateTaskDto();
        dto.title = 'Task teste';
        dto.projectId = '123e4567-e89b-12d3-a456-426614174000';
        dto.priority = priority;

        const errors = await validate(dto);
        
        expect(errors).toHaveLength(0);
      }
    });

    it('deve falhar com priority inválida', async () => {
      const invalidPriorities = [-1, 4, 10];
      
      for (const priority of invalidPriorities) {
        const dto = new CreateTaskDto();
        dto.title = 'Task teste';
        dto.projectId = '123e4567-e89b-12d3-a456-426614174000';
        dto.priority = priority;

        const errors = await validate(dto);
        
        expect(errors.length).toBeGreaterThan(0);
        const priorityError = errors.find(e => e.property === 'priority');
        expect(priorityError).toBeDefined();
      }
    });

    it('deve validar status enum corretamente', async () => {
      const dto = new CreateTaskDto();
      dto.title = 'Task teste';
      dto.projectId = '123e4567-e89b-12d3-a456-426614174000';
      dto.status = TaskStatus.IN_PROGRESS;

      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('Valores padrão', () => {
    it('deve usar valores padrão corretos', () => {
      const dto = new CreateTaskDto();
      
      expect(dto.status).toBe(TaskStatus.PENDING);
      expect(dto.priority).toBe(0);
    });
  });
});