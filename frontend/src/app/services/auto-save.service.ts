import { Injectable } from '@angular/core';
import { TaskService } from './task.service';
import { Task, UpdateTaskRequest, TaskPriority } from '../models/task.model';
import { Observable, Subject, debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * AUTO-SAVE SERVICE
 * 
 * Handles automatic saving of task changes with debounce to prevent excessive API calls.
 * Compatible with dynamic string status system used in the project.
 * Follows enterprise patterns for background persistence without blocking UI.
 */
@Injectable({
  providedIn: 'root'
})
export class AutoSaveService {
  private saveQueue = new Subject<{taskId: string, changes: any}>();
  private readonly DEBOUNCE_TIME = 1000; // 1 second delay before saving

  constructor(private taskService: TaskService) {
    this.initializeAutoSave();
  }

  private initializeAutoSave(): void {
    this.saveQueue.pipe(
      debounceTime(this.DEBOUNCE_TIME),
      distinctUntilChanged((prev, curr) => 
        prev.taskId === curr.taskId && 
        JSON.stringify(prev.changes) === JSON.stringify(curr.changes)
      )
    ).subscribe(({taskId, changes}) => {
      this.performSave(taskId, changes);
    });
  }

  /**
   * Auto-save priority change
   * @param task Task to update
   * @param priority New priority value
   */
  savePriority(task: Task, priority: TaskPriority): void {
    console.log(`🔄 AUTO-SAVE: Queuing priority change for task ${task.id}`, {priority, task});
    
    const changes = {
      priority: priority,
      title: task.title,
      description: task.description,
      status: task.status  // ← PRESERVA A COLUNA ATUAL!
    };

    console.log(`📦 AUTO-SAVE: Changes to be saved (with status):`, changes);
    this.saveQueue.next({taskId: task.id, changes});
  }

  /**
   * Auto-save any field change
   * @param task Task to update
   * @param fieldChanges Object with fields to change
   */
  saveField(task: Task, fieldChanges: any): void {
    const changes = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,  // ← PRESERVA STATUS SEMPRE
      ...fieldChanges
    };

    this.saveQueue.next({taskId: task.id, changes});
  }

  private performSave(taskId: string, changes: any): void {
    console.log(`🚀 AUTO-SAVE: Executing HTTP PATCH for task ${taskId}`, changes);
    
    this.taskService.updateTask(taskId, changes).subscribe({
      next: (updatedTask) => {
        console.log(`✅ AUTO-SAVE: SUCCESS - Task ${taskId} saved to database:`, updatedTask);
        // Emit success event if needed for UI feedback
      },
      error: (error) => {
        console.error(`❌ AUTO-SAVE: FAILED - Task ${taskId} could not be saved:`, error);
        console.error('Full error details:', error);
        // Could implement retry logic or user notification here
      }
    });
  }

  /**
   * Force immediate save (bypasses debounce)
   * @param taskId Task ID to save
   * @param changes Changes to save
   */
  forceSave(taskId: string, changes: any): Observable<Task> {
    return this.taskService.updateTask(taskId, changes);
  }
}