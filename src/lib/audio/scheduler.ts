/**
 * THE HOLD - Scheduler
 * 
 * CPU-efficient event scheduler using lookahead.
 * Schedules audio events ahead of time to prevent dropouts.
 * Based on the Web Audio API best practices.
 * 
 * Features:
 * - Lookahead scheduling (events scheduled ~100ms ahead)
 * - Event queue management
 * - Cancelable events
 * - CPU-efficient timing loop
 */

import { SchedulerEvent, SchedulerEventType, AUDIO_CONSTANTS } from './types';

export class Scheduler {
  private ctx: AudioContext;
  
  // Event queue
  private eventQueue: SchedulerEvent[] = [];
  private eventIdCounter: number = 0;
  
  // Scheduling
  private timerId: number | null = null;
  private lastScheduleTime: number = 0;
  
  // Configuration
  private lookahead: number = AUDIO_CONSTANTS.SCHEDULER_LOOKAHEAD;
  private scheduleInterval: number = AUDIO_CONSTANTS.SCHEDULER_INTERVAL;
  
  // State
  private isRunning: boolean = false;
  private isDestroyed: boolean = false;
  
  // Performance tracking
  private scheduleCount: number = 0;
  private lastPerformanceLog: number = 0;
  
  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }
  
  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning || this.isDestroyed) return;
    
    this.isRunning = true;
    this.lastScheduleTime = this.ctx.currentTime;
    
    // Start the scheduling loop
    this.runSchedulerLoop();
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
  
  /**
   * The main scheduler loop
   * Uses setTimeout for coarse timing, audio context time for precision
   */
  private runSchedulerLoop(): void {
    if (!this.isRunning || this.isDestroyed) return;
    
    // Schedule any events that fall within the lookahead window
    this.scheduleEvents();
    
    // Continue the loop
    this.timerId = window.setTimeout(() => {
      this.runSchedulerLoop();
    }, this.scheduleInterval * 1000);
  }
  
  /**
   * Schedule events that fall within the lookahead window
   */
  private scheduleEvents(): void {
    const currentTime = this.ctx.currentTime;
    const scheduleUntil = currentTime + this.lookahead;
    
    // Find events to schedule
    const eventsToSchedule: SchedulerEvent[] = [];
    const remainingEvents: SchedulerEvent[] = [];
    
    this.eventQueue.forEach(event => {
      if (event.time <= scheduleUntil) {
        eventsToSchedule.push(event);
      } else {
        remainingEvents.push(event);
      }
    });
    
    // Update queue with remaining events
    this.eventQueue = remainingEvents;
    
    // Execute scheduled events
    eventsToSchedule.forEach(event => {
      if (!event.cancelable || this.eventQueue.find(e => e.id === event.id)) {
        try {
          event.callback(event.time);
          this.scheduleCount++;
        } catch (error) {
          console.error(`[Scheduler] Error executing event ${event.id}:`, error);
        }
      }
    });
    
    // Performance logging (every 60 seconds)
    if (currentTime - this.lastPerformanceLog > 60) {
      this.logPerformance();
      this.lastPerformanceLog = currentTime;
    }
  }
  
  /**
   * Add an event to the queue
   */
  addEvent(
    type: SchedulerEventType,
    time: number,
    callback: (time: number) => void,
    cancelable: boolean = true
  ): string {
    const id = `event-${this.eventIdCounter++}`;
    
    const event: SchedulerEvent = {
      id,
      type,
      time,
      callback,
      cancelable,
    };
    
    // Insert in sorted order (by time)
    const insertIndex = this.eventQueue.findIndex(e => e.time > time);
    if (insertIndex === -1) {
      this.eventQueue.push(event);
    } else {
      this.eventQueue.splice(insertIndex, 0, event);
    }
    
    return id;
  }
  
  /**
   * Cancel a specific event
   */
  cancelEvent(eventId: string): boolean {
    const index = this.eventQueue.findIndex(e => e.id === eventId);
    if (index > -1) {
      this.eventQueue.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Cancel all events of a specific type
   */
  cancelEventsByType(type: SchedulerEventType): number {
    const beforeCount = this.eventQueue.length;
    this.eventQueue = this.eventQueue.filter(e => e.type !== type);
    return beforeCount - this.eventQueue.length;
  }
  
  /**
   * Cancel all events
   */
  cancelAllEvents(): void {
    this.eventQueue = [];
  }
  
  /**
   * Get queue statistics
   */
  getQueueStats(): { total: number; byType: Record<SchedulerEventType, number> } {
    const byType: Record<string, number> = {};
    
    this.eventQueue.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1;
    });
    
    return {
      total: this.eventQueue.length,
      byType: byType as Record<SchedulerEventType, number>,
    };
  }
  
  /**
   * Schedule a recurring event
   */
  scheduleRecurring(
    type: SchedulerEventType,
    interval: number,
    callback: (time: number) => void,
    startTime?: number,
    duration?: number
  ): { cancel: () => void } {
    const start = startTime ?? this.ctx.currentTime;
    const endTime = duration ? start + duration : Infinity;
    
    let nextTime = start;
    let isCancelled = false;
    
    const scheduleNext = () => {
      if (isCancelled || nextTime >= endTime) return;
      
      this.addEvent(type, nextTime, (time) => {
        callback(time);
        nextTime = time + interval;
        scheduleNext();
      });
    };
    
    scheduleNext();
    
    return {
      cancel: () => {
        isCancelled = true;
      },
    };
  }
  
  /**
   * Schedule a one-shot event
   */
  scheduleOnce(
    type: SchedulerEventType,
    delay: number,
    callback: (time: number) => void
  ): string {
    const time = this.ctx.currentTime + delay;
    return this.addEvent(type, time, callback, true);
  }
  
  /**
   * Schedule a ramp
   */
  scheduleRamp(
    param: AudioParam,
    targetValue: number,
    duration: number,
    startTime?: number,
    exponential: boolean = false
  ): string {
    const start = startTime ?? this.ctx.currentTime;
    
    return this.addEvent('parameterChange', start, (time) => {
      param.cancelScheduledValues(time);
      param.setValueAtTime(param.value, time);
      
      if (exponential) {
        param.exponentialRampToValueAtTime(targetValue, time + duration);
      } else {
        param.linearRampToValueAtTime(targetValue, time + duration);
      }
    });
  }
  
  /**
   * Set lookahead time
   */
  setLookahead(lookahead: number): void {
    this.lookahead = Math.max(0.05, Math.min(0.5, lookahead));
  }
  
  /**
   * Set schedule interval
   */
  setScheduleInterval(interval: number): void {
    this.scheduleInterval = Math.max(0.01, Math.min(0.1, interval));
  }
  
  /**
   * Log performance metrics
   */
  private logPerformance(): void {
    const queueStats = this.getQueueStats();
    console.log('[Scheduler] Performance:', {
      eventsScheduled: this.scheduleCount,
      queueSize: queueStats.total,
      queueByType: queueStats.byType,
    });
    this.scheduleCount = 0;
  }
  
  /**
   * Check if running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Destroy the scheduler
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stop();
    this.cancelAllEvents();
  }
}

/**
 * Utility: Schedule a grain event
 */
export function scheduleGrain(
  scheduler: Scheduler,
  time: number,
  callback: (time: number) => void
): string {
  return scheduler.addEvent('grain', time, callback, true);
}

/**
 * Utility: Schedule breath event
 */
export function scheduleBreath(
  scheduler: Scheduler,
  time: number,
  callback: (time: number) => void
): string {
  return scheduler.addEvent('breath', time, callback, true);
}

/**
 * Utility: Create a tempo-free timing function
 * Returns times based on breath cycles rather than BPM
 */
export function getBreathTiming(
  inhale: number = 4,
  exhale: number = 6,
  pause: number = 1
): { cycleDuration: number; getPhase: (time: number) => number } {
  const cycleDuration = inhale + exhale + pause;
  
  return {
    cycleDuration,
    getPhase: (time: number) => {
      const position = time % cycleDuration;
      
      if (position < inhale) {
        // Inhale phase (0 to 0.5)
        return (position / inhale) * 0.5;
      } else if (position < inhale + exhale) {
        // Exhale phase (0.5 to 1.0)
        return 0.5 + ((position - inhale) / exhale) * 0.5;
      } else {
        // Pause phase (return to 0)
        return 0;
      }
    },
  };
}

/**
 * Utility: Create a slowly evolving timing function
 * Returns times that drift and vary subtly
 */
export function getEvolvingTiming(
  baseInterval: number,
  variation: number = 0.1
): { next: () => number; reset: () => void } {
  let lastTime = 0;
  
  return {
    next: () => {
      const variationAmount = (Math.random() - 0.5) * 2 * variation;
      const interval = baseInterval * (1 + variationAmount);
      lastTime += interval;
      return lastTime;
    },
    reset: () => {
      lastTime = 0;
    },
  };
}

/**
 * Utility: Schedule with drift
 * Creates a schedule that slowly drifts over time
 */
export function scheduleWithDrift(
  scheduler: Scheduler,
  baseInterval: number,
  driftSpeed: number,
  callback: (time: number) => void
): { cancel: () => void } {
  let nextTime = scheduler['ctx'].currentTime;
  let driftPhase = 0;
  let isCancelled = false;
  
  const scheduleNext = () => {
    if (isCancelled) return;
    
    // Apply drift to interval
    driftPhase += driftSpeed;
    const driftAmount = Math.sin(driftPhase) * 0.2; // ±20% drift
    const interval = baseInterval * (1 + driftAmount);
    
    nextTime += interval;
    
    scheduler.addEvent('grain', nextTime, (time) => {
      callback(time);
      scheduleNext();
    });
  };
  
  scheduleNext();
  
  return {
    cancel: () => {
      isCancelled = true;
    },
  };
}
