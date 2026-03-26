import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@ApiTags('labels')
@Controller('labels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  @ApiOperation({ summary: 'List labels by project' })
  findByProject(@Query('projectId') projectId: string) {
    return this.labelsService.findByProject(projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a label' })
  create(@Body() dto: CreateLabelDto) {
    return this.labelsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a label' })
  update(@Param('id') id: string, @Body() dto: UpdateLabelDto, @Request() req) {
    return this.labelsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a label' })
  remove(@Param('id') id: string, @Request() req) {
    return this.labelsService.remove(id, req.user.id);
  }
}
