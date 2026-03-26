import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto, CreateChecklistItemDto, UpdateChecklistItemDto } from './dto/checklist.dto';

@ApiTags('checklists')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get('tasks/:taskId/checklists')
  @ApiOperation({ summary: 'Get checklists for a task' })
  findByTask(@Param('taskId') taskId: string) {
    return this.checklistsService.findByTask(taskId);
  }

  @Post('tasks/:taskId/checklists')
  @ApiOperation({ summary: 'Create a checklist for a task' })
  createChecklist(@Param('taskId') taskId: string, @Body() dto: CreateChecklistDto) {
    return this.checklistsService.createChecklist(taskId, dto.title);
  }

  @Patch('checklists/:id')
  @ApiOperation({ summary: 'Rename a checklist' })
  updateChecklist(@Param('id') id: string, @Body() dto: CreateChecklistDto) {
    return this.checklistsService.updateChecklist(id, dto.title);
  }

  @Delete('checklists/:id')
  @ApiOperation({ summary: 'Delete a checklist and its items' })
  removeChecklist(@Param('id') id: string) {
    return this.checklistsService.removeChecklist(id);
  }

  @Post('checklists/:id/items')
  @ApiOperation({ summary: 'Add item to checklist' })
  addItem(@Param('id') checklistId: string, @Body() dto: CreateChecklistItemDto) {
    return this.checklistsService.addItem(checklistId, dto.text);
  }

  @Patch('checklist-items/:id')
  @ApiOperation({ summary: 'Update checklist item text or status' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateChecklistItemDto, @Request() req) {
    return this.checklistsService.updateItem(id, dto, req.user?.id);
  }

  @Patch('checklist-items/:id/toggle')
  @ApiOperation({ summary: 'Toggle checklist item completion' })
  toggleItem(@Param('id') id: string, @Request() req) {
    return this.checklistsService.toggleItem(id, req.user?.id);
  }

  @Delete('checklist-items/:id')
  @ApiOperation({ summary: 'Delete checklist item' })
  removeItem(@Param('id') id: string) {
    return this.checklistsService.removeItem(id);
  }
}
