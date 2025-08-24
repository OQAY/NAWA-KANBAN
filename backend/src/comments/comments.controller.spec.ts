import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

describe('CommentsController - Sistema de Comentários', () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockCommentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByTask: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
    
    jest.clearAllMocks();
  });

  describe('1. ADICIONAR COMENTÁRIOS EM TASKS', () => {
    it('deve criar comentário básico', async () => {
      const createCommentDto: CreateCommentDto = {
        content: 'Este é um comentário de teste',
      };

      const expectedResult = {
        id: 'comment-1',
        content: 'Este é um comentário de teste',
        authorId: '1',
        createdAt: new Date(),
      };

      mockCommentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createCommentDto, 'task-123', { user: { id: '1' } });

      expect(service.create).toHaveBeenCalledWith(createCommentDto, 'task-123', '1');
      expect(result.content).toBe('Este é um comentário de teste');
    });

    it('deve permitir comentários longos', async () => {
      const longComment = 'A'.repeat(500); 
      const createCommentDto: CreateCommentDto = {
        content: longComment,
      };

      const expectedResult = {
        id: 'comment-1',
        content: longComment,
        authorId: '1',
      };

      mockCommentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createCommentDto, 'task-123', { user: { id: '1' } });

      expect(result.content).toHaveLength(500);
    });
  });

  describe('2. LISTAR COMENTÁRIOS POR TASK', () => {
    it('deve retornar comentários de uma task', async () => {
      const taskId = 'task-123';
      const expectedComments = [
        {
          id: 'comment-1',
          content: 'Primeiro comentário',
          authorId: '1',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'comment-2',
          content: 'Segundo comentário', 
          authorId: '2',
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockCommentsService.findByTask.mockResolvedValue(expectedComments);

      const result = await controller.findByTask(taskId, { user: { id: '1' } });

      expect(service.findByTask).toHaveBeenCalledWith(taskId, { id: '1' });
      expect(result).toHaveLength(2);
    });

    it('deve retornar array vazio para task sem comentários', async () => {
      const taskId = 'task-sem-comentarios';

      mockCommentsService.findByTask.mockResolvedValue([]);

      const result = await controller.findByTask(taskId, { user: { id: '1' } });

      expect(result).toHaveLength(0);
    });
  });

  describe('3. EDITAR COMENTÁRIOS', () => {
    it('deve atualizar conteúdo do comentário', async () => {
      const commentId = 'comment-1';
      const updateCommentDto: UpdateCommentDto = {
        content: 'Comentário editado',
      };

      const expectedResult = {
        id: 'comment-1',
        content: 'Comentário editado',
        authorId: '1',
      };

      mockCommentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(commentId, updateCommentDto, { user: { id: '1' } });

      expect(service.update).toHaveBeenCalledWith(commentId, updateCommentDto, '1');
      expect(result.content).toBe('Comentário editado');
    });
  });

  describe('4. TIMESTAMPS RELATIVOS', () => {
    it('deve retornar comentários com timestamps', async () => {
      const agora = new Date();
      const cinquominutos = new Date(agora.getTime() - 5 * 60 * 1000);

      const expectedComments = [
        {
          id: 'comment-1',
          content: 'Comentário recente',
          createdAt: cinquominutos,
        },
      ];

      mockCommentsService.findByTask.mockResolvedValue(expectedComments);

      const result = await controller.findByTask('task-123', { user: { id: '1' } });

      expect(result[0].createdAt).toBeDefined();
      expect(result[0].createdAt.getTime()).toBeLessThan(agora.getTime());
    });
  });

  describe('5. REMOVER COMENTÁRIOS', () => {
    it('deve permitir deletar comentário', async () => {
      const commentId = 'comment-1';

      mockCommentsService.remove.mockResolvedValue({ affected: 1 });

      await controller.remove(commentId, { user: { id: '1' } });

      expect(service.remove).toHaveBeenCalledWith(commentId, '1');
    });
  });
});