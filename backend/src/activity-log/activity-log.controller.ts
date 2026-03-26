import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityLogService } from './activity-log.service';

@ApiTags('activity-log')
@Controller('activity-log')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get activity log for an entity' })
  findByEntity(
    @Query('taskId') taskId: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogService.findByEntity(taskId, 'task', limit ? parseInt(limit) : 20);
  }
}
