import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
} from "../models/comment.model";

@Injectable({
  providedIn: "root",
})
export class CommentService {
  private apiUrl = "http://localhost:3000";

  constructor(private http: HttpClient) {}

  getCommentsByTask(taskId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/tasks/${taskId}/comments`);
  }

  createComment(
    taskId: string,
    comment: CreateCommentRequest
  ): Observable<Comment> {
    return this.http.post<Comment>(
      `${this.apiUrl}/tasks/${taskId}/comments`,
      comment
    );
  }

  updateComment(
    commentId: string,
    comment: UpdateCommentRequest
  ): Observable<Comment> {
    return this.http.patch<Comment>(
      `${this.apiUrl}/comments/${commentId}`,
      comment
    );
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/comments/${commentId}`);
  }
}
