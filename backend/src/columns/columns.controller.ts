import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('columns')
@Controller('columns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new column' })
  @ApiResponse({ status: 201, description: 'Column successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createColumnDto: CreateColumnDto, @Request() req) {
    return this.columnsService.create(createColumnDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get user columns' })
  @ApiResponse({ status: 200, description: 'Columns retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req) {
    return this.columnsService.findAll(req.user);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder all columns' })
  @ApiResponse({ status: 200, description: 'Columns reordered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  reorderAll(@Body() orderData: { columnIds: string[] }, @Request() req) {
    return this.columnsService.reorder(orderData.columnIds, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get column by ID' })
  @ApiResponse({ status: 200, description: 'Column found' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.columnsService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update column' })
  @ApiResponse({ status: 200, description: 'Column successfully updated' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(@Param('id') id: string, @Body() updateColumnDto: UpdateColumnDto, @Request() req) {
    return this.columnsService.update(id, updateColumnDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete column' })
  @ApiResponse({ status: 200, description: 'Column successfully deleted' })
  @ApiResponse({ status: 404, description: 'Column not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @Request() req) {
    return this.columnsService.remove(id, req.user);
  }

  @Patch(':id/reorder')
  @ApiOperation({ summary: 'Reorder columns' })
  @ApiResponse({ status: 200, description: 'Columns reordered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  reorder(@Body() orderData: { columnIds: string[] }, @Request() req) {
    return this.columnsService.reorder(orderData.columnIds, req.user);
  }
}