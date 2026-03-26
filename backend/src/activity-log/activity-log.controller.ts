import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityLogService } from './activity-log.service';
import { TasksService } from '../tasks/tasks.service';

@ApiTags('activity-log')
@Controller('activity-log')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityLogController {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get activity log for an entity' })
  async findByEntity(
    @Query('taskId') taskId: string,
    @Query('limit') limit: string,
    @Request() req,
  ) {
    // Verify the user has access to the task before returning logs
    await this.tasksService.findOne(taskId, req.user);
    return this.activityLogService.findByEntity(taskId, 'task', limit ? parseInt(limit) : 20);
  }
}
