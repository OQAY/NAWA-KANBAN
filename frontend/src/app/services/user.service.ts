import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface BoardConfig {
  boardConfig: string | null;
}

export interface UpdateBoardConfigResponse {
  success: boolean;
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  private apiUrl = "http://localhost:3000/users";

  constructor(private http: HttpClient) {}

  getBoardConfig(): Observable<BoardConfig> {
    return this.http.get<BoardConfig>(`${this.apiUrl}/me/board-config`);
  }

  updateBoardConfig(
    boardConfig: string
  ): Observable<UpdateBoardConfigResponse> {
    return this.http.patch<UpdateBoardConfigResponse>(
      `${this.apiUrl}/me/board-config`,
      {
        boardConfig,
      }
    );
  }
}
