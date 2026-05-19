import { Injectable } from '@angular/core';

const STORAGE_KEY = 'sulbrasil_admin_pin';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  getPin(): string | null {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  guardarPin(pin: string): void {
    sessionStorage.setItem(STORAGE_KEY, pin);
  }

  cerrarSesion(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  estaAutenticado(): boolean {
    return !!this.getPin();
  }
}
