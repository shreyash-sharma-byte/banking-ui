import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    inject(Router).navigate(['/login']);
    return false;
  }
  // Check expiry
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      inject(Router).navigate(['/login']);
      return false;
    }
  } catch(e) {
    inject(Router).navigate(['/login']);
    return false;
  }
  return true;
};
