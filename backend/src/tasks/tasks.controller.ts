import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto, MoveTaskDto } from './dto/task-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.tasksService.create(createTaskDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: TaskQueryDto, @Request() req) {
    return this.tasksService.findAll(query, req.user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tasks by title or description' })
  @ApiQuery({ name: 'query', required: true, description: 'Search query string' })
  @ApiResponse({ status: 200, description: 'Tasks matching search query' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  searchTasks(@Query('query') searchQuery: string, @Request() req) {
    return this.tasksService.searchTasks(searchQuery, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task found' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.tasksService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task successfully updated' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Request() req) {
    return this.tasksService.update(id, updateTaskDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task successfully deleted' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @Request() req) {
    return this.tasksService.remove(id, req.user);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move task to another project' })
  @ApiResponse({ status: 200, description: 'Task successfully moved' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  moveTask(@Param('id') id: string, @Body() moveTaskDto: MoveTaskDto, @Request() req) {
    return this.tasksService.moveTask(id, moveTaskDto.projectId, req.user);
  }

  @Post(':id/labels/:labelId')
  @ApiOperation({ summary: 'Add label to task' })
  addLabel(@Param('id') id: string, @Param('labelId') labelId: string) {
    return this.tasksService.addLabel(id, labelId);
  }

  @Delete(':id/labels/:labelId')
  @ApiOperation({ summary: 'Remove label from task' })
  removeLabel(@Param('id') id: string, @Param('labelId') labelId: string) {
    return this.tasksService.removeLabel(id, labelId);
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Get subtasks for a task' })
  getSubtasks(@Param('id') id: string) {
    return this.tasksService.getSubtasks(id);
  }

  @Post(':id/subtasks')
  @ApiOperation({ summary: 'Create a subtask' })
  createSubtask(@Param('id') id: string, @Body() body: { title: string; projectId?: string }, @Request() req) {
    return this.tasksService.createSubtask(id, body.title, body.projectId, req.user);
  }
}