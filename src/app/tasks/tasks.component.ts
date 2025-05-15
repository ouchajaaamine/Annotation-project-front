import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent implements OnInit {
  tasks: any[] = [];
  userName: string = '';
  taskProgressMap: { [key: string]: number } = {};

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http.get<any>('http://localhost:8080/api/user/tasks').subscribe({
      next: (data) => {
        this.tasks = data.tasks || [];
        this.userName = data.userName || '';
        this.taskProgressMap = data.taskProgressMap || {};
      },
      error: (err) => {
        this.tasks = [];
        this.userName = '';
        this.taskProgressMap = {};
      }
    });
  }

  goToAnnotate(taskId: number) {
    console.log("heey")
    this.http.get<any>(`http://localhost:8080/api/user/tasks/${taskId}`).subscribe({
      next: (data) => {
        this.router.navigate(['/user/annotate', taskId]);
      },
      error: (err) => {
        console.error('Erreur API:', err);
        alert('Erreur lors de la récupération des détails de la tâche');
      }
    });
  }
}
