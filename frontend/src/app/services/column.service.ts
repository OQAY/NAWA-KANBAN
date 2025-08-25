import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Column, CreateColumnRequest, UpdateColumnRequest } from '../models/column.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ColumnService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getColumns(): Observable<Column[]> {
    return this.http.get<Column[]>(`${this.apiUrl}/columns`);
  }

  createColumn(column: CreateColumnRequest): Observable<Column> {
    return this.http.post<Column>(`${this.apiUrl}/columns`, column);
  }

  updateColumn(id: string, column: UpdateColumnRequest): Observable<Column> {
    return this.http.patch<Column>(`${this.apiUrl}/columns/${id}`, column);
  }

  deleteColumn(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/columns/${id}`);
  }

  reorderColumns(columnIds: string[]): Observable<Column[]> {
    return this.http.patch<Column[]>(`${this.apiUrl}/columns/reorder`, { columnIds });
  }
}