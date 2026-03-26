import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-member.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto, @Req() req) {
    return this.service.create(dto, req.user);
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user);
  }

  @Get('my-overview')
  getMyOverview(@Req() req) {
    return this.service.getMyOverview(req.user);
  }

  @Patch('reorder')
  reorderOrgs(@Body('orgIds') orgIds: string[], @Req() req) {
    return this.service.reorderOrgs(orgIds, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.service.findOne(id, req.user);
  }

  @Get(':id/overview')
  getOverview(@Param('id') id: string, @Req() req) {
    return this.service.getOverview(id, req.user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto, @Req() req) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, req.user);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @Req() req) {
    return this.service.getMembers(id, req.user);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddOrganizationMemberDto, @Req() req) {
    return this.service.addMember(id, dto, req.user);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body('role') role: string,
    @Req() req,
  ) {
    return this.service.updateMember(id, memberId, role, req.user);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Req() req) {
    return this.service.removeMember(id, memberId, req.user);
  }
}
