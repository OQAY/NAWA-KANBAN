import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationRule } from '../database/entities/automation-rule.entity';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AutomationRule])],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService],
})
export class AutomationsModule {}
