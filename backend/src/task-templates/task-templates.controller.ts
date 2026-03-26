import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskTemplatesService } from './task-templates.service';

@ApiTags('task-templates')
@Controller('task-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TaskTemplatesController {
  constructor(private readonly taskTemplatesService: TaskTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List task templates' })
  findAll(@Query('projectId') projectId: string, @Request() req) {
    return this.taskTemplatesService.findByProject(projectId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task template' })
  create(@Body() body: { name: string; data: Record<string, unknown>; projectId?: string }, @Request() req) {
    return this.taskTemplatesService.create(body.name, body.data, req.user.id, body.projectId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task template' })
  remove(@Param('id') id: string, @Request() req) {
    return this.taskTemplatesService.remove(id, req.user.id);
  }
}
