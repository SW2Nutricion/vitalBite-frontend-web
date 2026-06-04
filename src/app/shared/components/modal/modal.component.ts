import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-modal',
  imports: [LucideX],
  template: `
    @if (open) {
      <div class="modal-backdrop" (click)="close.emit()">
        <section class="modal-panel" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div>
              <p class="eyebrow">{{ eyebrow }}</p>
              <h2>{{ title }}</h2>
            </div>
            <button class="icon-btn" type="button" (click)="close.emit()" aria-label="Cerrar">
              <svg lucideX size="18"></svg>
            </button>
          </header>
          <ng-content />
        </section>
      </div>
    }
  `,
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() eyebrow = '';
  @Output() close = new EventEmitter<void>();
}
