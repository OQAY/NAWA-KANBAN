import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { ProjectMember } from '../database/entities/project-member.entity';
import { Project } from '../database/entities/project.entity';
import { AiAgentService } from './ai-agent.service';

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://iakanba.oqay.pro', /https:\/\/.*\.vercel\.app$/]
      : [
          'http://localhost:4200',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          'http://localhost:5176',
          'http://localhost:5177',
        ],
    credentials: true,
  },
  namespace: '/ai-chat',
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AiGateway.name);
  private connectedUsers = new Map<string, User>();
  private rateLimits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private aiAgentService: AiAgentService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      this.connectedUsers.set(client.id, user);
      this.logger.log(`User ${user.name} connected (${client.id})`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} rejected: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.logger.log(`User ${user.name} disconnected (${client.id})`);
      // Do NOT reset session on disconnect — memory persists in Redis
      this.connectedUsers.delete(client.id);
    }
  }

  @SubscribeMessage('joinProject')
  async handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    if (!data?.projectId) return;

    const user = this.connectedUsers.get(client.id);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Verify user has access to this project (owner or member)
    const isOwner = await this.projectRepository.findOne({
      where: { id: data.projectId, ownerId: user.id },
      select: ['id'],
    });

    if (!isOwner) {
      const isMember = await this.memberRepository.findOne({
        where: { projectId: data.projectId, userId: user.id },
        select: ['id'],
      });

      if (!isMember) {
        this.logger.warn(`User ${user.name} denied access to project room ${data.projectId}`);
        client.emit('error', { message: 'Sem acesso a este projeto' });
        return;
      }
    }

    client.join(`project:${data.projectId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string; projectId?: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Input validation
    if (!data?.message || typeof data.message !== 'string') {
      client.emit('error', { message: 'Message is required' });
      return;
    }

    const message = data.message.trim();
    if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) {
      client.emit('error', {
        message: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`,
      });
      return;
    }

    // Rate limiting
    if (this.isRateLimited(user.id)) {
      client.emit('error', {
        message: 'Muitas mensagens. Aguarde um momento.',
      });
      return;
    }

    // Emit typing indicator
    client.emit('aiTyping', { typing: true });

    try {
      // LangChain agent handles everything: context, tools, memory
      const aiResponse = await this.aiAgentService.chat(
        user,
        message,
        data.projectId,
      );

      // executedActions come from agent with real success status
      const executedActions = aiResponse.actions?.map(a => ({
        action: a.action,
        success: (a as any).success !== false,
        params: a.params,
      }));

      // Send response
      client.emit('aiResponse', {
        text: aiResponse.text,
        actions: aiResponse.actions,
        executedActions,
        timestamp: new Date().toISOString(),
      });

      // Broadcast board update if any task actions were executed
      const hasTaskActions = aiResponse.actions?.some(a =>
        ['create_task', 'move_task', 'update_task', 'delete_task'].includes(a.action),
      );

      if (hasTaskActions && data.projectId) {
        this.server.to(`project:${data.projectId}`).emit('boardUpdated', {
          projectId: data.projectId,
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Chat error: ${error.message}`);
      client.emit('aiResponse', {
        text: 'Erro ao processar mensagem. Tente novamente.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.emit('aiTyping', { typing: false });
    }
  }

  @SubscribeMessage('resetChat')
  async handleResetChat(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      await this.aiAgentService.resetSession(user.id);
      client.emit('chatReset', { success: true });
    }
  }

  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(userId);

    if (!limit || now > limit.resetAt) {
      this.rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return false;
    }

    limit.count++;
    if (limit.count > RATE_LIMIT_MAX) {
      return true;
    }

    return false;
  }
}
