import { Component, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage { id: number; msg: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toasts.asObservable();
  private counter = 0;

  mostrar(msg: string) {
    const id = this.counter++;
    const current = this.toasts.getValue();
    this.toasts.next([...current, { id, msg }]);
    
    // O Toast desaparece sozinho após 3 segundos
    setTimeout(() => this.remover(id), 3000);
  }

  remover(id: number) {
    const current = this.toasts.getValue();
    this.toasts.next(current.filter(t => t.id !== id));
  }
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div class="toast" *ngFor="let toast of toastService.toasts$ | async" (click)="toastService.remover(toast.id)">
        {{ toast.msg }}
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 90px; /* Fica acima da barra inferior no celular */
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
      width: max-content;
      max-width: 90vw;
    }
    .toast {
      background-color: var(--text-main);
      color: var(--bg-main);
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius-full);
      font-size: 0.9rem;
      font-weight: 500;
      box-shadow: var(--shadow-lg);
      pointer-events: auto;
      cursor: pointer;
      animation: slideUp 0.3s ease forwards;
      text-align: center;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}