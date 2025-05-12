import { Component, OnInit } from '@angular/core';
import { AdminAnnotatorsService, Annotator } from '../admin-annotators.service';
import { NgClass, NgIf } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-annotators',
  templateUrl: './annotateurs.component.html',
  styleUrls: ['./annotateurs.component.css'],
  standalone: true,
  imports: [
    NgClass,
    CommonModule,
    FormsModule,
    NgIf
  ]
})
export class AnnotatorsComponent implements OnInit {
  annotators: Annotator[] = [];
  loading = true;
  showModal = false;
  isEditMode = false;
  notification = {
    show: false,
    message: '',
    type: 'success'
  };
  newAnnotator: Annotator = {
    nom: '',
    prenom: '',
    login: ''
  };

  constructor(private annotatorsService: AdminAnnotatorsService) {}

  ngOnInit() {
    this.loadAnnotators();
  }

  showNotification(message: string, type: 'success' | 'error' = 'success') {
    this.notification = {
      show: true,
      message,
      type
    };
    setTimeout(() => {
      this.notification.show = false;
    }, 3000);
  }

  get activeAnnotatorsCount(): number {
    return this.annotators.filter(a => !a.deleted).length;
  }

  get inactiveAnnotatorsCount(): number {
    return this.annotators.filter(a => a.deleted).length;
  }

  loadAnnotators() {
    this.loading = true;
    this.annotatorsService.getAnnotators().subscribe({
      next: (data: any) => {
        console.log('API response:', data);
        this.annotators = Array.isArray(data) ? data : data.annotateurs || data.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showNotification('Error loading annotators', 'error');
      }
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.newAnnotator = {
      nom: '',
      prenom: '',
      login: ''
    };
    this.showModal = true;
  }

  openEditModal(annotator: Annotator) {
    this.isEditMode = true;
    this.newAnnotator = { ...annotator };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isEditMode = false;
    this.newAnnotator = {
      nom: '',
      prenom: '',
      login: ''
    };
  }

  addAnnotator() {
    this.annotatorsService.createOrUpdateAnnotator(this.newAnnotator).subscribe({
      next: (response) => {
        this.showNotification(this.isEditMode ? 'Annotator updated successfully' : 'Annotator added successfully');
        this.closeModal();
        this.loadAnnotators();
      },
      error: (error) => {
        console.error('Error saving annotator:', error);
        this.showNotification('Error saving annotator', 'error');
      }
    });
  }

  deleteAnnotator(id: number) {
    if (confirm('Are you sure you want to delete this annotator?')) {
      this.annotatorsService.deleteAnnotator(id).subscribe({
        next: () => {
          this.annotators = this.annotators.filter(a => a.id !== id);
          this.showNotification('Annotator deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting annotator:', error);
          this.showNotification('Error deleting annotator', 'error');
        }
      });
    }
  }
}
