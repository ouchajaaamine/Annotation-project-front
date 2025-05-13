import {Routes} from '@angular/router';
import {LoginComponent} from './login/login.component';
import { authGuard } from './authGuard';
import {roleGuard} from './roleGuard';
export let routes: Routes;
routes = [
  {path: 'login', component: LoginComponent},
  {
    path: 'admin/dashboard',
    canActivate: [authGuard, roleGuard('ROLE_ADMIN_ROLE')],
    loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'user/dashboard',
    canActivate: [authGuard, roleGuard('ROLE_USER_ROLE')],
    loadComponent: () => import('./user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent)
  },
  {
    path: 'admin/annotateurs',
    canActivate: [authGuard, roleGuard('ROLE_ADMIN_ROLE')],
    loadComponent: () => import('./annotateurs/annotateurs.component').then(m => m.AnnotatorsComponent)
  },
  {
    path: 'admin/datasets',
    canActivate: [authGuard, roleGuard('ROLE_ADMIN_ROLE')],
    loadComponent: () => import('./datasets/datasets.component').then(m => m.DatasetsComponent)


  },
  {path: '**', redirectTo: '/login'}
];

