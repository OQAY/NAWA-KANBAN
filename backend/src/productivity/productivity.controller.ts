import { Controller, Get, Post, Body, Query, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HeartbeatService } from './services/heartbeat.service';
import { PomodoroService } from './services/pomodoro.service';
import { AnalyticsService } from './services/analytics.service';
import { IdleResolutionService } from './services/idle-resolution.service';
import { CreateHeartbeatBulkDto } from './dto/create-heartbeat-bulk.dto';
import { QueryAnalyticsDto, CreatePomodoroDto } from './dto/query-analytics.dto';
import { CreateIdleResolutionDto } from './dto/create-idle-resolution.dto';

@ApiTags('productivity')
@Controller('productivity')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductivityController {
  constructor(
    private readonly heartbeatService: HeartbeatService,
    private readonly pomodoroService: PomodoroService,
    private readonly analyticsService: AnalyticsService,
    private readonly idleResolutionService: IdleResolutionService,
  ) {}

  // ---------------------------------------------------------------
  // INGESTAO: Monitor Python envia heartbeats em batch
  // ---------------------------------------------------------------

  @Post('heartbeats/bulk')
  @ApiOperation({ summary: 'Ingest batched activity heartbeats from desktop monitor' })
  @ApiResponse({ status: 201, description: 'Events ingested successfully' })
  ingestHeartbeats(@Body() dto: CreateHeartbeatBulkDto, @Request() req) {
    return this.heartbeatService.ingestHeartbeats(dto, req.user.id);
  }

  // ---------------------------------------------------------------
  // POMODORO
  // ---------------------------------------------------------------

  @Post('pomodoro/sessions')
  @ApiOperation({ summary: 'Register a completed/paused Pomodoro session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  createPomodoroSession(@Body() dto: CreatePomodoroDto, @Request() req) {
    return this.pomodoroService.createSession(dto, req.user.id);
  }

  @Get('pomodoro/sessions')
  @ApiOperation({ summary: 'Get Pomodoro session history' })
  getPomodoroSessions(@Query() query: QueryAnalyticsDto, @Request() req) {
    return this.pomodoroService.getSessions(req.user.id, query.from, query.to);
  }

  // ---------------------------------------------------------------
  // ANALYTICS
  // ---------------------------------------------------------------

  @Get('analytics/daily')
  @ApiOperation({ summary: 'Get daily summary (stored/cached)' })
  getDailyAnalytics(@Query() query: QueryAnalyticsDto, @Request() req) {
    return this.analyticsService.getDailyAnalytics(req.user.id, query.from, query.to);
  }

  @Get('analytics/today')
  @ApiOperation({ summary: 'Get live summary for today (aggregated from heartbeats)' })
  getTodaySummary(@Request() req) {
    const now = new Date();
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const today = brt.toISOString().split('T')[0];
    return this.analyticsService.getDailySummaryLive(req.user.id, today);
  }

  @Get('analytics/timeline')
  @ApiOperation({ summary: 'Get hourly activity breakdown for a day' })
  getTimeline(@Query('date') date: string, @Request() req) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getHourlyBreakdown(req.user.id, d);
  }

  @Get('analytics/heartbeats')
  @ApiOperation({ summary: 'Get raw heartbeats for a day (timeline view)' })
  getHeartbeats(@Query('date') date: string, @Request() req) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getTimelineForDay(req.user.id, d);
  }

  @Get('analytics/minutes')
  @ApiOperation({ summary: 'Get minute-by-minute breakdown for a specific hour' })
  getMinuteBreakdown(@Query('date') date: string, @Query('hour') hour: string, @Request() req) {
    const d = date || new Date().toISOString().split('T')[0];
    const h = parseInt(hour) || new Date().getHours();
    return this.analyticsService.getMinuteBreakdown(req.user.id, d, h);
  }

  @Get('analytics/apps')
  @ApiOperation({ summary: 'Get time breakdown by application for a day' })
  getAppBreakdown(@Query('date') date: string, @Request() req) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getAppBreakdown(req.user.id, d);
  }

  @Get('analytics/weekly')
  @ApiOperation({ summary: 'Get 30-day history with streaks and heatmap levels' })
  getWeeklyHistory(@Request() req) {
    return this.analyticsService.getWeeklyHistory(req.user.id);
  }

  @Get('analytics/windows')
  @ApiOperation({ summary: 'Get time breakdown by window title (with optional app filter)' })
  getWindowDetails(@Query('date') date: string, @Query('app') app: string, @Request() req) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getWindowDetails(req.user.id, d, app || undefined);
  }

  @Get('analytics/categories')
  @ApiOperation({ summary: 'Get time breakdown by productivity category (-2 to +2)' })
  getCategoryBreakdown(@Query('date') date: string, @Request() req) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getCategoryBreakdown(req.user.id, d);
  }

  @Get('analytics/work-score')
  @ApiOperation({ summary: 'Get work score timeline (per-hour averages)' })
  getWorkScoreTimeline(@Query('date') date: string, @Request() req) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getWorkScoreTimeline(req.user.id, d);
  }

  @Get('analytics/timeseries')
  @ApiOperation({ summary: 'Adaptive time series: resolution=1m|5m|1h, from/to as ISO timestamps' })
  getTimeSeries(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('resolution') resolution: string,
    @Request() req,
  ) {
    const now = new Date().toISOString();
    const f = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const t = to || now;
    const r = ['1m', '5m', '1h'].includes(resolution) ? resolution : '5m';
    return this.analyticsService.getTimeSeries(req.user.id, f, t, r);
  }

  @Get('analytics/pulse')
  @ApiOperation({ summary: 'Get Productivity Pulse (0-100, RescueTime formula)' })
  getProductivityPulse(@Query('date') date: string, @Request() req) {
    const d = date || new Date().toISOString().split('T')[0];
    return this.analyticsService.getProductivityPulse(req.user.id, d);
  }

  // ---------------------------------------------------------------
  // IDLE RESOLUTIONS
  // ---------------------------------------------------------------

  @Post('idle-resolutions')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register what user was doing during a long idle period' })
  createIdleResolution(@Body() dto: CreateIdleResolutionDto, @Request() req) {
    return this.idleResolutionService.create(dto, req.user.id);
  }

  @Get('idle-resolutions')
  @ApiOperation({ summary: 'Get idle resolutions log for a day' })
  getIdleResolutions(@Query('date') date: string, @Request() req) {
    const now = new Date();
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const d = date || brt.toISOString().split('T')[0];
    return this.idleResolutionService.getByDate(req.user.id, d);
  }
}
