import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

export interface Annotateur { id: number; login: string; role: string; }
export interface Couple { id: number; text_1: string; text_2: string; originalId: number; }
export interface Task {
  id: number;
  dateLimite: string;
  annotateur: Annotateur;
  couples: Couple[];
}
export interface DatasetRaw {
  id: number;
  name: string;
  description: string;
  fileType: string;
  tasks: Task[];
}
export interface DatasetView {
  id: number;
  name: string;
  status: 'Completed' | 'In Progress' | 'Unassigned';
  progress: number; // 0 à 100
  raw: DatasetRaw;
}

@Injectable({ providedIn: 'root' })
export class AdminDatasetsService {
  private apiUrl = 'http://localhost:8080/api/admin/datasets';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getDatasets(): Observable<DatasetView[]> {
    try {
      const headers = this.getHeaders();
      return this.http.get<any>(this.apiUrl, { headers }).pipe(
        map(res => {
          console.log('Raw API response:', res);
          if (!res || !res.datasets) {
            throw new Error('Invalid response format');
          }
          return (res.datasets || []).map((d: DatasetRaw) => {
            let status: 'Completed' | 'In Progress' | 'Unassigned' = 'Unassigned';
            let totalCouples = 0;
            let totalAnnotated = 0;

            if (d.tasks && d.tasks.length > 0) {
              totalCouples = d.tasks.reduce((sum, t) => sum + (t.couples?.length || 0), 0);
              totalAnnotated = totalCouples;
              if (totalCouples === 0) {
                status = 'Unassigned';
              } else if (totalAnnotated === totalCouples) {
                status = 'Completed';
              } else {
                status = 'In Progress';
              }
            }

            const progress = totalCouples > 0 ? (totalAnnotated / totalCouples) * 100 : 0;

            return {
              id: d.id,
              name: d.name,
              status,
              progress,
              raw: d
            };
          });
        }),
        catchError(error => {
          console.error('Error in getDatasets:', error);
          return throwError(() => new Error(error.message || 'Failed to load datasets'));
        })
      );
    } catch (error) {
      console.error('Error setting up request:', error);
      return throwError(() => new Error('Failed to setup request'));
    }
  }

  createDataset(formData: FormData): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(this.apiUrl, formData, { headers });
  }

  assignTask(datasetId: number, body: any) {
    const headers = this.getHeaders();
    return this.http.post<any>(`http://localhost:8080/api/admin/tasks/datasets/${datasetId}/assign`, body, { headers });
  }
} 