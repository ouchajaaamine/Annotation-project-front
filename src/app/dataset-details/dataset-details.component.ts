import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {DecimalPipe} from '@angular/common';
import { CommonModule } from '@angular/common';
import {FormsModule} from '@angular/forms';

interface Annotateur { id: number; login: string; role: string; }
interface Couple { id: number; text_1: string; text_2: string; originalId: number; }
interface Task {
  id: number;
  dateLimite: string;
  annotateur: Annotateur;
  couples: Couple[];
}
interface DatasetRaw {
  id: number;
  name: string;
  description: string;
  fileType: string;
  tasks: Task[];
}

@Component({
  selector: 'app-dataset-details',
  templateUrl: './dataset-details.component.html',
  styleUrls: ['./dataset-details.component.css'],
  imports: [
    DecimalPipe,
    CommonModule,
    FormsModule
  ],
  standalone: true
})
export class DatasetDetailsComponent implements OnInit {
  dataset: any = null;
  coupleTexts: any[] = [];
  loading = true;
  notFound = false;
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  datasetInfo: any = null;
  annotations: any[] = [];
  annotators: any[] = [];
  filteredAnnotators: any[] = [];
  searchTerm: string = '';
  annotationFilter: 'all' | 'annotated' | 'not_annotated' = 'all';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get('http://localhost:8080/api/admin/datasets').subscribe({
      next: (data: any) => {
        if (data && data.datasets) {
          this.datasetInfo = data.datasets.find((d: any) => d.id == id);
        }
        this.http.get(`http://localhost:8080/api/admin/datasets/details/${id}?page=0&size=1000`).subscribe({
          next: (details: any) => {
            this.dataset = details;
            this.coupleTexts = (details.coupleTexts || []).map((c: any) => ({
              id: c.id,
              text_1: c.text_1,
              text_2: c.text_2
            }));
            this.totalPages = Math.ceil(this.coupleTexts.length / this.itemsPerPage);
            this.http.get(`http://localhost:8080/api/admin/tasks/datasets/${id}/annotators`).subscribe((annotators: any) => {
              this.annotators = Array.isArray(annotators) ? annotators : [];
              this.filteredAnnotators = this.annotators;
              this.annotations = this.annotators.flatMap(a => a.annotations || []);
              this.applyAnnotatorFilters();
            });
            this.loading = false;
          },
          error: () => {
            this.notFound = true;
            this.loading = false;
          }
        });
      },
      error: () => {
        this.notFound = true;
        this.loading = false;
      }
    });
  }

  applyAnnotatorFilters() {
    this.filteredAnnotators = this.annotators.filter(a => {
      // Filtrage par annotation
      const hasAnnotation = (a.annotations || []).some((ann: any) => ann.coupleText);
      if (this.annotationFilter === 'annotated' && !hasAnnotation) return false;
      if (this.annotationFilter === 'not_annotated' && hasAnnotation) return false;
      // Filtrage par recherche
      const search = this.searchTerm.toLowerCase();
      return (
        a.nom.toLowerCase().includes(search) ||
        a.prenom.toLowerCase().includes(search) ||
        a.login.toLowerCase().includes(search)
      );
    });
  }

  onSearchAnnotator(term: any) {
    this.searchTerm = typeof term === 'string' ? term : (term?.target?.value || '');
    this.applyAnnotatorFilters();
  }

  onFilterChange(filter: any) {
    this.annotationFilter = typeof filter === 'string' ? filter : (filter?.target?.value || 'all');
    this.applyAnnotatorFilters();
  }

  backToList() {
    this.router.navigate(['/admin/datasets']);
  }

  getAnnotationClass(coupleId: number): string | null {
    const annotation = this.annotations.find(a => a.coupleText && a.coupleText.id === coupleId);
    return annotation ? annotation.chosenClass : null;
  }

  get totalTextPairs(): number {
    return this.dataset?.tasks?.reduce((sum: number, t: any) => sum + (t.couples?.length || 0), 0) || 0;
  }
  get assignedTextPairs(): number {
    return this.totalTextPairs; // ici, tous les couples sont assignés si présents dans tasks
  }
  get unassignedTextPairs(): number {
    return 0; // à adapter si tu as une logique d'unassigned
  }
  get progress(): number {
    // Ici, on considère que tous les couples sont annotés si présents
    return this.totalTextPairs > 0 ? 100 : 0;
  }

  isAnnotatorAnnotated(a: any): boolean {
    return (a.annotations || []).some((ann: any) => ann.coupleText);
  }
}
