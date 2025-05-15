import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDatasetsService, DatasetView, Task as ServiceTask, Annotateur as ServiceAnnotateur } from '../admin-datasets.service';
import { RouterModule } from '@angular/router';
import { AdminAnnotatorsService, Annotator } from '../admin-annotators.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Dataset {
  id: number;
  name: string;
  description: string;
  filePath: string;
  fileType: string;
  tasks: ServiceTask[];
  classesPossibles: Class[];
  coupleTexts: any;
}

interface Task {
  id: number;
  dateLimite: string;
  annotateur: Annotator;
  couples: any;
}

interface Annotateur {
  id: number;
  nom: string;
  prenom: string;
  login: string;
  deleted: boolean;
  role: Role;
}

interface Role {
  id: number;
  role: string;
}

interface Class {
  id: number;
  textClass: string;
}

@Component({
  selector: 'app-datasets',
  templateUrl: './datasets.component.html',
  styleUrls: ['./datasets.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class DatasetsComponent implements OnInit {
  datasets: Dataset[] = [];
  filteredDatasetsAll: Dataset[] = [];
  filteredDatasets: Dataset[] = [];
  searchTerm = '';
  showFilterMenu = false;
  filters = { completed: false, inProgress: false, unassigned: false };
  currentPage = 1;
  pageSize = 5;
  showAddModal = false;
  newDataset = {
    name: '',
    description: '',
    classesRaw: '',
    file: null as File | null
  };
  isSubmitting = false;
  addError = '';
  showAssignModal = false;
  assignAnnotators: Annotator[] = [];
  assignSelectedAnnotators: number[] = [];
  assignDeadline: string = '';
  assignError = '';
  assignLoading = false;
  assignDatasetId: number|null = null;
  today = new Date().toISOString().split('T')[0];
  error = '';

  constructor(
    private datasetsService: AdminDatasetsService,
    private annotatorsService: AdminAnnotatorsService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadDatasets();
  }

  loadDatasets() {
    this.datasetsService.getDatasets().subscribe({
      next: (datasets) => {
        console.log('Datasets loaded:', datasets);
        this.datasets = datasets.map(d => ({
          id: d.id,
          name: d.name,
          description: d.raw.description || '',
          filePath: '',
          fileType: d.raw.fileType || '',
          tasks: d.raw.tasks || [],
          classesPossibles: [],
          coupleTexts: []
        }));
        this.filteredDatasetsAll = [...this.datasets];
        this.updatePage();
      },
      error: (error) => {
        console.error('Error loading datasets:', error);
        this.error = 'Failed to load datasets. Please try again later.';
      }
    });
  }

  // Stats
  get completedCount() { 
    return this.datasets.filter(d => d.tasks && d.tasks.length > 0).length; 
  }
  get inProgressCount() { 
    return this.datasets.filter(d => d.tasks && d.tasks.length > 0 && d.tasks.some(t => t.couples && t.couples.length > 0)).length; 
  }
  get unassignedCount() { 
    return this.datasets.filter(d => !d.tasks || d.tasks.length === 0).length; 
  }

  // Recherche et filtres
  onSearch() { this.applyFilters(); }
  toggleFilterMenu() { this.showFilterMenu = !this.showFilterMenu; }
  onFilterChange() { this.applyFilters(); }
  applyFilters() {
    let result = [...this.datasets];
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.trim().toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(search));
    }
    const { completed, inProgress, unassigned } = this.filters;
    if (completed || inProgress || unassigned) {
      result = result.filter(d => {
        const status = this.getStatus(d);
        return (completed && status === 'Completed') ||
               (inProgress && status === 'In Progress') ||
               (unassigned && status === 'Unassigned');
      });
    }
    this.filteredDatasetsAll = result;
    this.currentPage = 1;
    this.updatePage();
    this.showFilterMenu = false;
  }
  clearFilters() {
    this.filters = { completed: false, inProgress: false, unassigned: false };
    this.searchTerm = '';
    this.applyFilters();
    this.showFilterMenu = true;
  }
  updatePage() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredDatasets = this.filteredDatasetsAll.slice(start, end);
  }
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePage();
    }
  }
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePage();
    }
  }
  get totalPages() {
    return Math.ceil(this.filteredDatasetsAll.length / this.pageSize) || 1;
  }

  openAddModal() {
    this.showAddModal = true;
    this.newDataset = { name: '', description: '', classesRaw: '', file: null };
    this.addError = '';
  }
  closeAddModal() {
    this.showAddModal = false;
  }
  onFileSelected(event: any) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.newDataset.file = file;
    }
  }
  submitAddDataset() {
    if (!this.newDataset.name || !this.newDataset.description || !this.newDataset.classesRaw || !this.newDataset.file) {
      this.addError = 'All fields are required.';
      return;
    }
    this.isSubmitting = true;
    this.addError = '';
    const formData = new FormData();
    formData.append('name', this.newDataset.name);
    formData.append('description', this.newDataset.description);
    formData.append('classesRaw', this.newDataset.classesRaw);
    formData.append('file', this.newDataset.file);
    this.datasetsService.createDataset(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeAddModal();
        this.ngOnInit(); // refresh list
      },
      error: err => {
        this.isSubmitting = false;
        this.addError = err?.error?.message || 'Failed to add dataset.';
      }
    });
  }

  openAssignModal(datasetId: number) {
    this.assignDatasetId = datasetId;
    this.assignError = '';
    this.assignLoading = false;
    this.assignSelectedAnnotators = [];
    this.assignDeadline = '';
    this.showAssignModal = true;
    this.annotatorsService.getAnnotators().subscribe({
      next: (data: any) => {
        this.assignAnnotators = (Array.isArray(data) ? data : data.annotateurs || data.data || []).filter((a: any) => !a.deleted);
      },
      error: (err) => {
        this.assignAnnotators = [];
        this.assignError = 'Erreur lors du chargement des annotateurs: ' + (err?.error?.message || 'Erreur inconnue');
      }
    });
  }
  closeAssignModal() {
    this.showAssignModal = false;
    this.assignDatasetId = null;
  }
  submitAssign() {
    if (!this.assignDatasetId || this.assignSelectedAnnotators.length < 3 || !this.assignDeadline) {
      this.assignError = 'Sélectionnez au moins 3 annotateurs et une deadline.';
      return;
    }
    this.assignLoading = true;
    this.assignError = '';
    const body = {
      annotatorIds: this.assignSelectedAnnotators,
      deadline: new Date(this.assignDeadline).getTime()
    };
    this.datasetsService.assignTask(this.assignDatasetId, body).subscribe({
      next: () => {
        this.assignLoading = false;
        this.closeAssignModal();
        this.ngOnInit();
      },
      error: err => {
        this.assignLoading = false;
        this.assignError = err?.error?.error || 'Erreur lors de l\'assignation.';
      }
    });
  }

  onAnnotatorCheckboxChange(event: any, id: number) {
    if (event.target.checked) {
      if (!this.assignSelectedAnnotators.includes(id)) {
        this.assignSelectedAnnotators.push(id);
      }
    } else {
      this.assignSelectedAnnotators = this.assignSelectedAnnotators.filter(i => i !== id);
    }
  }

  getStatus(dataset: Dataset): string {
    console.log('Getting status for dataset:', dataset);
    const status = dataset.tasks && dataset.tasks.length > 0 ? 'Assigned' : 'Unassigned';
    console.log('Status:', status);
    return status;
  }

  getStatusClass(dataset: Dataset): string {
    const statusClass = dataset.tasks && dataset.tasks.length > 0 ? 'status-assigned' : 'status-unassigned';
    console.log('Status class:', statusClass);
    return statusClass;
  }

  getProgress(dataset: Dataset): number {
    if (!dataset.tasks || dataset.tasks.length === 0) {
      return 0;
    }
    
    const totalTasks = dataset.tasks.length;
    const completedTasks = dataset.tasks.filter(task => task.couples !== null).length;
    
    return (completedTasks / totalTasks) * 100;
  }
}