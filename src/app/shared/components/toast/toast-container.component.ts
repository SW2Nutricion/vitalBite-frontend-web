import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { LucideCheckCircle, LucideXCircle, LucideAlertCircle, LucideInfo, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideCheckCircle, LucideXCircle, LucideAlertCircle, LucideInfo, LucideX],
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="flex items-center gap-3 p-4 min-w-[300px] rounded-lg shadow-lg border animate-fade-in-up"
          [ngClass]="{
            'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400': toast.type === 'success',
            'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400': toast.type === 'error',
            'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-400': toast.type === 'warning',
            'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400': toast.type === 'info'
          }"
        >
          <div class="flex-shrink-0">
            @if (toast.type === 'success') { <svg lucideCheckCircle size="20"></svg> }
            @if (toast.type === 'error') { <svg lucideXCircle size="20"></svg> }
            @if (toast.type === 'warning') { <svg lucideAlertCircle size="20"></svg> }
            @if (toast.type === 'info') { <svg lucideInfo size="20"></svg> }
          </div>
          <div class="flex-1 font-medium text-sm">
            {{ toast.message }}
          </div>
          <button 
            (click)="toastService.remove(toast.id)"
            class="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg lucideX size="16"></svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(1rem); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.3s ease-out;
    }
  `]
})
export class ToastContainerComponent {
  public toastService = inject(ToastService);
}
