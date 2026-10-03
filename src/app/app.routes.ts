import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./features/register/register').then(m => m.Register) },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard), canActivate: [authGuard] },
  { path: 'transfer', loadComponent: () => import('./features/transfer/transfer').then(m => m.Transfer), canActivate: [authGuard] },
  { path: 'history', loadComponent: () => import('./features/history/history').then(m => m.History), canActivate: [authGuard] },
  { path: 'accounts/new', loadComponent: () => import('./features/new-account/new-account').then(m => m.NewAccount), canActivate: [authGuard] },
  { path: '', loadComponent: () => import('./features/welcome/welcome').then(m => m.Welcome) },
  { path: '**', redirectTo: '/dashboard' }
];
