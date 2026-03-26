import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SprintsService } from './sprints.service';
import { Sprint } from '../database/entities/sprint.entity';

@ApiTags('sprints')
@Controller('sprints')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  @ApiOperation({ summary: 'List sprints for a project' })
  findAll(@Query('projectId') projectId: string) {
    return this.sprintsService.findByProject(projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a sprint' })
  create(@Body() body: Partial<Sprint>) {
    return this.sprintsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sprint' })
  update(@Param('id') id: string, @Body() body: Partial<Sprint>) {
    return this.sprintsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sprint (planning only)' })
  remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a sprint' })
  start(@Param('id') id: string) {
    return this.sprintsService.start(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a sprint' })
  complete(@Param('id') id: string) {
    return this.sprintsService.complete(id);
  }
}
