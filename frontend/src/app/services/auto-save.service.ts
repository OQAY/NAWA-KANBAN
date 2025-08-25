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
    const changes = {
      priority: priority,
      title: task.title,
      description: task.description
    };

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
      ...fieldChanges
    };

    this.saveQueue.next({taskId: task.id, changes});
  }

  private performSave(taskId: string, changes: any): void {
    this.taskService.updateTask(taskId, changes).subscribe({
      next: (updatedTask) => {
        console.log(`✅ Auto-saved task ${taskId}:`, changes);
        // Emit success event if needed for UI feedback
      },
      error: (error) => {
        console.error(`❌ Auto-save failed for task ${taskId}:`, error);
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