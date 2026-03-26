import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutomationsService } from './automations.service';
import { AutomationRule } from '../database/entities/automation-rule.entity';

@ApiTags('automations')
@Controller('automations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'List automation rules for a project' })
  findAll(@Query('projectId') projectId: string) {
    return this.automationsService.findByProject(projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an automation rule' })
  create(@Body() body: Partial<AutomationRule>) {
    return this.automationsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an automation rule' })
  update(@Param('id') id: string, @Body() body: Partial<AutomationRule>, @Request() req) {
    return this.automationsService.update(id, body, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an automation rule' })
  remove(@Param('id') id: string, @Request() req) {
    return this.automationsService.remove(id, req.user.id);
  }
}
