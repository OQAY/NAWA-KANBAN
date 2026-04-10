import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ProductivityHeartbeat } from '../../database/entities/productivity-heartbeat.entity';
import { PomodoroSession } from '../../database/entities/pomodoro-session.entity';
import { DailySummary } from '../../database/entities/daily-summary.entity';
import { TZ, UTC_OFFSET_HOURS, dayRangeUTC } from '../productivity.utils';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ProductivityHeartbeat)
    private heartbeatRepo: Repository<ProductivityHeartbeat>,
    @InjectRepository(PomodoroSession)
    private pomodoroRepo: Repository<PomodoroSession>,
    @InjectRepository(DailySummary)
    private summaryRepo: Repository<DailySummary>,
  ) {}

  async getDailyAnalytics(userId: string, from?: string, to?: string) {
    const today = new Date().toISOString().split('T')[0];
    const startDate = from || today;
    const endDate = to || today;

    return this.summaryRepo.find({
      where: { userId, summaryDate: Between(startDate, endDate) },
      order: { summaryDate: 'ASC' },
    });
  }

  async getTimelineForDay(userId: string, date: string) {
    const { start: startOfDay, end: endOfDay } = dayRangeUTC(date);
    return this.heartbeatRepo.find({
      where: { userId, startTime: Between(startOfDay, endOfDay) },
      order: { startTime: 'ASC' },
    });
  }

  async getDailySummaryLive(userId: string, date: string) {
    const { start: startOfDay, end: endOfDay } = dayRangeUTC(date);

    // ---------------------------------------------------------------
    // Detectar início da sessão de trabalho real via janelas horárias.
    //
    // Algoritmo: agrega active_seconds por hora BRT e encontra a primeira
    // hora com >600s ativo (>10min) onde a hora anterior tinha <120s ativo
    // (<2min). Isso ignora blips de background processes durante a noite.
    //
    // Fallback: se não encontrar pelo critério horário, usa o primeiro
    // heartbeat não-afk do dia.
    // ---------------------------------------------------------------

    const allHeartbeats = await this.heartbeatRepo.find({
      where: { userId, startTime: Between(startOfDay, endOfDay) },
      order: { startTime: 'ASC' },
    });

    let workSessionStart: Date | null = null;
    let sessionActiveSeconds = 0;
    let sessionAfkSeconds = 0;

    if (allHeartbeats.length > 0) {
      const activeByHour: Map<number, number> = new Map();
      for (const hb of allHeartbeats) {
        if (!hb.isAfk) {
          const brtHour = new Date(hb.startTime.getTime() - 3 * 60 * 60 * 1000).getUTCHours();
          activeByHour.set(brtHour, (activeByHour.get(brtHour) ?? 0) + hb.durationSeconds);
        }
      }

      let sessionStartHour: number | null = null;
      for (let i = 1; i < 24; i++) {
        const prev = activeByHour.get(i - 1) ?? 0;
        const curr = activeByHour.get(i) ?? 0;
        if (curr > 600 && prev < 120) {
          sessionStartHour = i;
          break;
        }
      }

      if (sessionStartHour !== null) {
        workSessionStart = new Date(startOfDay.getTime() + sessionStartHour * 60 * 60 * 1000);
      } else {
        const firstActive = allHeartbeats.find(hb => !hb.isAfk);
        workSessionStart = firstActive?.startTime ?? allHeartbeats[0].startTime;
      }

      for (const hb of allHeartbeats) {
        if (hb.startTime < workSessionStart) continue;
        if (hb.isAfk) {
          sessionAfkSeconds += hb.durationSeconds;
        } else {
          sessionActiveSeconds += hb.durationSeconds;
        }
      }
    }

    const result = await this.heartbeatRepo
      .createQueryBuilder('hb')
      .select('SUM(hb.duration_seconds)', 'totalSeconds')
      .addSelect('SUM(CASE WHEN hb.is_afk = false THEN hb.duration_seconds ELSE 0 END)', 'activeSeconds')
      .addSelect('SUM(CASE WHEN hb.is_afk = true THEN hb.duration_seconds ELSE 0 END)', 'afkSeconds')
      .addSelect('SUM(CASE WHEN hb.alert_level = 1 THEN 1 ELSE 0 END)', 'alertsLevel1')
      .addSelect('SUM(CASE WHEN hb.alert_level = 2 THEN 1 ELSE 0 END)', 'alertsLevel2')
      .addSelect('SUM(CASE WHEN hb.alert_level = 3 THEN 1 ELSE 0 END)', 'alertsLevel3')
      .addSelect('MIN(hb.start_time)', 'firstActivity')
      .addSelect('MAX(hb.end_time)', 'lastActivity')
      .addSelect('COUNT(*)', 'totalEvents')
      .where('hb.user_id = :userId', { userId })
      .andWhere('hb.start_time >= :start', { start: startOfDay })
      .andWhere('hb.start_time <= :end', { end: endOfDay })
      .getRawOne();

    const sessionHeartbeats = allHeartbeats.filter(
      hb => !hb.isAfk && workSessionStart && hb.startTime >= workSessionStart,
    );

    let longestStreak = 0;
    let currentStreak = 0;
    for (let i = 0; i < sessionHeartbeats.length; i++) {
      if (i === 0) {
        currentStreak = sessionHeartbeats[i].durationSeconds;
      } else {
        const gap = (sessionHeartbeats[i].startTime.getTime() - sessionHeartbeats[i - 1].endTime.getTime()) / 1000;
        if (gap <= 60) {
          currentStreak += sessionHeartbeats[i].durationSeconds + gap;
        } else {
          currentStreak = sessionHeartbeats[i].durationSeconds;
        }
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    }

    const pomodoros = await this.pomodoroRepo
      .createQueryBuilder('p')
      .select("COUNT(CASE WHEN p.status = 'completed' THEN 1 END)", 'completed')
      .addSelect("COUNT(CASE WHEN p.status != 'completed' THEN 1 END)", 'interrupted')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.started_at >= :start', { start: startOfDay })
      .andWhere('p.started_at <= :end', { end: endOfDay })
      .getRawOne();

    const sessionTotal = sessionActiveSeconds + sessionAfkSeconds;
    const focusScore = sessionTotal > 0 ? Math.round((sessionActiveSeconds / sessionTotal) * 100) : 0;

    return {
      date,
      totalTrackedSeconds: parseInt(result?.totalSeconds) || 0,
      activeSeconds: sessionActiveSeconds,
      afkSeconds: sessionAfkSeconds,
      alertsLevel1: parseInt(result?.alertsLevel1) || 0,
      alertsLevel2: parseInt(result?.alertsLevel2) || 0,
      alertsLevel3: parseInt(result?.alertsLevel3) || 0,
      longestFocusStreakSeconds: Math.round(longestStreak),
      pomodoroCompleted: parseInt(pomodoros?.completed) || 0,
      pomodoroInterrupted: parseInt(pomodoros?.interrupted) || 0,
      focusScore,
      firstActivityAt: result?.firstActivity || null,
      lastActivityAt: result?.lastActivity || null,
      workSessionStart: workSessionStart?.toISOString() || null,
      totalEvents: parseInt(result?.totalEvents) || 0,
    };
  }

  async getHourlyBreakdown(userId: string, date: string) {
    const { start: startOfDay, end: endOfDay } = dayRangeUTC(date);

    const hourly = await this.heartbeatRepo
      .createQueryBuilder('hb')
      .select(`EXTRACT(HOUR FROM hb.start_time AT TIME ZONE '${TZ}')`, 'hour')
      .addSelect('SUM(CASE WHEN hb.is_afk = false THEN hb.duration_seconds ELSE 0 END)', 'activeSeconds')
      .addSelect('SUM(CASE WHEN hb.is_afk = true THEN hb.duration_seconds ELSE 0 END)', 'afkSeconds')
      .addSelect('COUNT(*)', 'events')
      .where('hb.user_id = :userId', { userId })
      .andWhere('hb.start_time >= :start', { start: startOfDay })
      .andWhere('hb.start_time <= :end', { end: endOfDay })
      .groupBy(`EXTRACT(HOUR FROM hb.start_time AT TIME ZONE '${TZ}')`)
      .orderBy('hour', 'ASC')
      .getRawMany();

    return Array.from({ length: 24 }, (_, i) => {
      const found = hourly.find(h => parseInt(h.hour) === i);
      return {
        hour: i,
        activeSeconds: parseInt(found?.activeSeconds) || 0,
        afkSeconds: parseInt(found?.afkSeconds) || 0,
        events: parseInt(found?.events) || 0,
      };
    });
  }

  async getMinuteBreakdown(userId: string, date: string, hour: number) {
    const { start: dayStart } = dayRangeUTC(date);
    const hourStartUTC = new Date(dayStart.getTime() + hour * 60 * 60 * 1000);
    const hourEndUTC = new Date(hourStartUTC.getTime() + 60 * 60 * 1000);

    const heartbeats = await this.heartbeatRepo.find({
      where: { userId, startTime: Between(hourStartUTC, hourEndUTC) },
      order: { startTime: 'ASC' },
    });

    const minutes = Array.from({ length: 60 }, (_, m) => ({
      minute: m,
      active: false,
      afk: false,
      appName: '',
      windowTitle: '',
      durationSeconds: 0,
    }));

    for (const hb of heartbeats) {
      const hbStart = new Date(hb.startTime);
      const hbEnd = new Date(hb.endTime);

      for (let m = 0; m < 60; m++) {
        const minuteStart = new Date(hourStartUTC.getTime() + m * 60 * 1000);
        const minuteEnd = new Date(minuteStart.getTime() + 60 * 1000);

        if (hbStart < minuteEnd && hbEnd > minuteStart) {
          const overlapStart = Math.max(hbStart.getTime(), minuteStart.getTime());
          const overlapEnd = Math.min(hbEnd.getTime(), minuteEnd.getTime());
          const overlapSec = Math.round((overlapEnd - overlapStart) / 1000);

          if (overlapSec > minutes[m].durationSeconds) {
            minutes[m].durationSeconds = overlapSec;
            minutes[m].active = !hb.isAfk;
            minutes[m].afk = hb.isAfk;
            minutes[m].appName = hb.appName || '';
            minutes[m].windowTitle = hb.windowTitle || '';
          }
        }
      }
    }

    return minutes;
  }

  async getAppBreakdown(userId: string, date: string) {
    const { start: startOfDay, end: endOfDay } = dayRangeUTC(date);

    const apps = await this.heartbeatRepo
      .createQueryBuilder('hb')
      .select('hb.app_name', 'appName')
      .addSelect('SUM(hb.duration_seconds)', 'totalSeconds')
      .addSelect('COUNT(*)', 'events')
      .where('hb.user_id = :userId', { userId })
      .andWhere('hb.start_time >= :start', { start: startOfDay })
      .andWhere('hb.start_time <= :end', { end: endOfDay })
      .andWhere('hb.is_afk = false')
      .andWhere("hb.app_name IS NOT NULL AND hb.app_name != ''")
      .groupBy('hb.app_name')
      .orderBy('SUM(hb.duration_seconds)', 'DESC')
      .getRawMany();

    return apps.map(a => ({
      appName: a.appName,
      totalSeconds: parseInt(a.totalSeconds) || 0,
      events: parseInt(a.events) || 0,
    }));
  }

  async getWindowDetails(userId: string, date: string, appName?: string) {
    const { start: startOfDay, end: endOfDay } = dayRangeUTC(date);

    const qb = this.heartbeatRepo
      .createQueryBuilder('hb')
      .select('hb.app_name', 'appName')
      .addSelect('hb.window_title', 'windowTitle')
      .addSelect('SUM(hb.duration_seconds)', 'totalSeconds')
      .where('hb.user_id = :userId', { userId })
      .andWhere('hb.start_time >= :start', { start: startOfDay })
      .andWhere('hb.start_time <= :end', { end: endOfDay })
      .andWhere('hb.is_afk = false')
      .andWhere("hb.window_title IS NOT NULL AND hb.window_title != ''");

    if (appName) {
      qb.andWhere('hb.app_name = :appName', { appName });
    }

    const windows = await qb
      .groupBy('hb.app_name')
      .addGroupBy('hb.window_title')
      .orderBy('SUM(hb.duration_seconds)', 'DESC')
      .limit(50)
      .getRawMany();

    return windows.map(w => ({
      appName: w.appName,
      windowTitle: w.windowTitle,
      totalSeconds: parseInt(w.totalSeconds) || 0,
    }));
  }

  async getWeeklyHistory(userId: string) {
    const nowBRT = new Date(Date.now() - UTC_OFFSET_HOURS * 60 * 60 * 1000);
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(nowBRT);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const results = [];
    for (const date of days) {
      const { start, end } = dayRangeUTC(date);
      const row = await this.heartbeatRepo
        .createQueryBuilder('hb')
        .select('SUM(CASE WHEN hb.is_afk = false THEN hb.duration_seconds ELSE 0 END)', 'activeSeconds')
        .addSelect('SUM(CASE WHEN hb.is_afk = true THEN hb.duration_seconds ELSE 0 END)', 'afkSeconds')
        .addSelect('AVG(CASE WHEN hb.focus_score > 0 THEN hb.focus_score END)', 'avgFocusScore')
        .addSelect('COUNT(*)', 'events')
        .where('hb.user_id = :userId', { userId })
        .andWhere('hb.start_time >= :start', { start })
        .andWhere('hb.start_time <= :end', { end })
        .getRawOne();

      const activeSeconds = parseInt(row?.activeSeconds) || 0;
      results.push({
        date,
        activeSeconds,
        afkSeconds: parseInt(row?.afkSeconds) || 0,
        avgFocusScore: Math.round(parseFloat(row?.avgFocusScore) || 0),
        events: parseInt(row?.events) || 0,
        level: activeSeconds === 0 ? 0 : activeSeconds < 3600 ? 1 : activeSeconds < 7200 ? 2 : activeSeconds < 14400 ? 3 : 4,
      });
    }

    let longestStreak = 0;
    let tempStreak = 0;
    for (const day of results) {
      if (day.activeSeconds >= 3600) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    return { days: results, currentStreak: tempStreak, longestStreak };
  }

  async getCategoryBreakdown(userId: string, date: string) {
    const { start, end } = dayRangeUTC(date);

    const rows = await this.heartbeatRepo
      .createQueryBuilder('hb')
      .select('hb.productivity_category', 'category')
      .addSelect('SUM(hb.duration_seconds)', 'totalSeconds')
      .addSelect('COUNT(*)', 'events')
      .where('hb.user_id = :userId', { userId })
      .andWhere('hb.start_time >= :start', { start })
      .andWhere('hb.start_time <= :end', { end })
      .andWhere('hb.is_afk = false')
      .groupBy('hb.productivity_category')
      .orderBy('hb.productivity_category', 'DESC')
      .getRawMany();

    const names: Record<string, string> = {
      '2': 'Very Productive', '1': 'Productive', '0': 'Neutral',
      '-1': 'Distracting', '-2': 'Very Distracting',
    };
    const totalActive = rows.reduce((s, r) => s + (parseInt(r.totalSeconds) || 0), 0);

    return rows.map(r => ({
      category: parseInt(r.category),
      name: names[r.category] || 'Unknown',
      totalSeconds: parseInt(r.totalSeconds) || 0,
      events: parseInt(r.events) || 0,
      percentage: totalActive > 0 ? Math.round(((parseInt(r.totalSeconds) || 0) / totalActive) * 100) : 0,
    }));
  }

  async getWorkScoreTimeline(userId: string, date: string) {
    const { start, end } = dayRangeUTC(date);

    const hourly = await this.heartbeatRepo
      .createQueryBuilder('hb')
      .select(`EXTRACT(HOUR FROM hb.start_time AT TIME ZONE '${TZ}')`, 'hour')
      .addSelect('AVG(CASE WHEN hb.work_score > 0 THEN hb.work_score END)', 'avgWorkScore')
      .addSelect('AVG(hb.keystroke_rate)', 'avgKeystrokeRate')
      .addSelect('SUM(CASE WHEN hb.whisper_active = true THEN hb.duration_seconds ELSE 0 END)', 'whisperSeconds')
      .addSelect('COUNT(*)', 'events')
      .where('hb.user_id = :userId', { userId })
      .andWhere('hb.start_time >= :start', { start })
      .andWhere('hb.start_time <= :end', { end })
      .andWhere('hb.is_afk = false')
      .groupBy(`EXTRACT(HOUR FROM hb.start_time AT TIME ZONE '${TZ}')`)
      .orderBy('hour', 'ASC')
      .getRawMany();

    return Array.from({ length: 24 }, (_, i) => {
      const found = hourly.find(h => parseInt(h.hour) === i);
      return {
        hour: i,
        avgWorkScore: Math.round(parseFloat(found?.avgWorkScore) || 0),
        avgKeystrokeRate: Math.round(parseFloat(found?.avgKeystrokeRate) || 0),
        whisperMinutes: Math.round((parseInt(found?.whisperSeconds) || 0) / 60),
        events: parseInt(found?.events) || 0,
      };
    });
  }

  // ---------------------------------------------------------------
  // TIMESERIES: Adaptive resolution endpoint (1m / 5m / 1h)
  // Uses PostgreSQL generate_series + interval splitting to return
  // continuous buckets with no holes, respecting variable-duration heartbeats.
  // ---------------------------------------------------------------

  async getTimeSeries(userId: string, from: string, to: string, resolution: string) {
    const VALID: Record<string, string> = {
      '1m': '1 minute',
      '5m': '5 minutes',
      '1h': '1 hour',
    };
    const intervalStr = VALID[resolution] ?? '5 minutes';

    const rows: any[] = await this.heartbeatRepo.query(
      `WITH buckets AS (
         SELECT generate_series(
           $1::timestamptz,
           $2::timestamptz,
           $3::interval
         ) AS bucket_start
       )
       SELECT
         b.bucket_start                                                   AS "timestamp",
         COALESCE(SUM(CASE WHEN hb.is_afk = false
           THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (
                  LEAST(hb.end_time,   b.bucket_start + $3::interval)
                - GREATEST(hb.start_time, b.bucket_start)
           )))::int) ELSE 0 END), 0)::int                                AS "activeSeconds",
         COALESCE(SUM(CASE WHEN hb.is_afk = true
           THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (
                  LEAST(hb.end_time,   b.bucket_start + $3::interval)
                - GREATEST(hb.start_time, b.bucket_start)
           )))::int) ELSE 0 END), 0)::int                                AS "afkSeconds",
         COALESCE(ROUND(AVG(
           CASE WHEN hb.work_score > 0 AND hb.is_afk = false
                THEN hb.work_score END
         ))::int, 0)                                                     AS "avgWorkScore"
       FROM buckets b
       LEFT JOIN productivity_heartbeats hb
         ON  hb.user_id    = $4
         AND hb.start_time < b.bucket_start + $3::interval
         AND hb.end_time   > b.bucket_start
       GROUP BY b.bucket_start
       ORDER BY b.bucket_start`,
      [from, to, intervalStr, userId],
    );

    return rows.map(r => ({
      timestamp: new Date(r.timestamp).toISOString(),
      activeSeconds: Number(r.activeSeconds) || 0,
      afkSeconds: Number(r.afkSeconds) || 0,
      avgWorkScore: Number(r.avgWorkScore) || 0,
    }));
  }

  async getProductivityPulse(userId: string, date: string) {
    const { start, end } = dayRangeUTC(date);

    const rows = await this.heartbeatRepo
      .createQueryBuilder('hb')
      .select('hb.productivity_category', 'category')
      .addSelect('SUM(hb.duration_seconds)', 'totalSeconds')
      .where('hb.user_id = :userId', { userId })
      .andWhere('hb.start_time >= :start', { start })
      .andWhere('hb.start_time <= :end', { end })
      .andWhere('hb.is_afk = false')
      .groupBy('hb.productivity_category')
      .getRawMany();

    let totalSeconds = 0;
    let weightedSum = 0;
    const byCategory: Record<number, number> = {};

    for (const row of rows) {
      const cat = parseInt(row.category);
      const secs = parseInt(row.totalSeconds) || 0;
      byCategory[cat] = secs;
      totalSeconds += secs;
      weightedSum += secs * cat;
    }

    // P = ((W + 2*T) / (4*T)) * 100
    const pulse = totalSeconds > 0
      ? Math.round(((weightedSum + 2 * totalSeconds) / (4 * totalSeconds)) * 100)
      : 0;

    return {
      pulse: Math.max(0, Math.min(100, pulse)),
      totalActiveSeconds: totalSeconds,
      details: {
        veryProductive: byCategory[2] || 0,
        productive: byCategory[1] || 0,
        neutral: byCategory[0] || 0,
        distracting: byCategory[-1] || 0,
        veryDistracting: byCategory[-2] || 0,
      },
    };
  }
}
