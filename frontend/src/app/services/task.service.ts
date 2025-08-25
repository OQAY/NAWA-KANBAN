import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQueryParams,
} from "../models/task.model";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: "root",
})
export class TaskService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTasks(params?: TaskQueryParams): Observable<any> {
    return this.http.get(`${this.apiUrl}/tasks`, { params: params as any });
  }

  createTask(task: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/tasks`, task);
  }

  updateTask(id: string, task: UpdateTaskRequest): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/tasks/${id}`, task);
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${id}`);
  }
}
