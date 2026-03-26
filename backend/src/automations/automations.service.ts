import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { AutomationRule } from '../database/entities/automation-rule.entity';

@Injectable()
export class AutomationsService {
  constructor(
    @InjectRepository(AutomationRule)
    private ruleRepository: Repository<AutomationRule>,
  ) {}

  async findByProject(projectId: string): Promise<AutomationRule[]> {
    return this.ruleRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<AutomationRule>): Promise<AutomationRule> {
    const rule = this.ruleRepository.create(data);
    return this.ruleRepository.save(rule);
  }

  async update(id: string, data: Partial<AutomationRule>): Promise<AutomationRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    Object.assign(rule, data);
    return this.ruleRepository.save(rule);
  }

  async remove(id: string): Promise<void> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    await this.ruleRepository.remove(rule);
  }

  async evaluate(eventType: string, context: { projectId: string; [key: string]: unknown }): Promise<void> {
    const rules = await this.ruleRepository.find({
      where: { projectId: context.projectId, enabled: true },
    });

    for (const rule of rules) {
      if (rule.trigger.type === eventType) {
        await this.execute(rule, context);
      }
    }
  }

  private async execute(rule: AutomationRule, context: Record<string, unknown>): Promise<void> {
    // Record execution
    rule.lastRunAt = new Date();
    rule.runCount += 1;
    await this.ruleRepository.save(rule);

    // Actions are logged but actual execution depends on injected services
    // This is a simplified version — full implementation would use BullMQ queue
    console.log(`[Automation] Rule "${rule.name}" executed. Actions:`, rule.actions);
  }

  @OnEvent('task.status_changed')
  async handleStatusChanged(payload: { projectId: string; taskId: string; oldStatus: string; newStatus: string }) {
    await this.evaluate('task.status_changed', payload);
  }

  @OnEvent('task.created')
  async handleTaskCreated(payload: { projectId?: string; taskId: string }) {
    if (payload.projectId) {
      await this.evaluate('task.created', { projectId: payload.projectId, taskId: payload.taskId });
    }
  }

  @OnEvent('task.assigned')
  async handleTaskAssigned(payload: { projectId?: string; taskId: string; assigneeId: string }) {
    if (payload.projectId) {
      await this.evaluate('task.assigned', { projectId: payload.projectId, ...payload });
    }
  }
}
