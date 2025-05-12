import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../api.service';
import jwt_decode from 'jwt-decode';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    HttpClientModule
  ],
  providers: [ApiService],
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(private apiService: ApiService, private router: Router) {}

  onSubmit() {
    this.errorMessage = '';
    this.isLoading = true;

    const credentials = { login: this.username, password: this.password };
    this.apiService.login(credentials).subscribe({
      next: (response) => {
        const token = response.token;
        localStorage.setItem('token', token);
        const role = this.getRoleFromToken(token);
        
        if (role === 'ROLE_ADMIN_ROLE') {
          this.router.navigate(['/admin/dashboard']);
        } else if (role === 'ROLE_USER_ROLE') {
          this.router.navigate(['/user/dashboard']);
        } else {
          this.errorMessage = 'Rôle non reconnu';
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        if (error.status === 401) {
          this.errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect';
        } else {
          this.errorMessage = 'Une erreur est survenue lors de la connexion';
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  getRoleFromToken(token: string): string {
    try {
      const decoded: any = jwt_decode(token);
      return decoded.role;
    } catch (error) {
      console.error('Error decoding token:', error);
      return "null";
    }
  }
}
