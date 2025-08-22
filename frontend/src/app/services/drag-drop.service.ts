/**
 * Serviço simples para centralizar estado de drag and drop
 * Extração direta das variáveis existentes no kanban
 */
import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class DragDropService {
  // Variáveis exatas copiadas do kanban.component.ts
  draggedTask: Task | null = null;
  draggedColumn: any = null;
  dragOverColumnIndex: number | null = null;
  isDragOverTrash = false;
  touchStartPosition: { x: number; y: number } | null = null;

  // Métodos simples para gerenciar estado
  setDraggedTask(task: Task | null): void {
    this.draggedTask = task;
  }

  setDraggedColumn(column: any): void {
    this.draggedColumn = column;
  }

  setDragOverColumn(index: number | null): void {
    this.dragOverColumnIndex = index;
  }

  setDragOverTrash(isDragOver: boolean): void {
    this.isDragOverTrash = isDragOver;
  }

  setTouchStartPosition(position: { x: number; y: number } | null): void {
    this.touchStartPosition = position;
  }

  // Reset geral
  resetDragState(): void {
    this.draggedTask = null;
    this.draggedColumn = null;
    this.dragOverColumnIndex = null;
    this.isDragOverTrash = false;
    this.touchStartPosition = null;
  }
}