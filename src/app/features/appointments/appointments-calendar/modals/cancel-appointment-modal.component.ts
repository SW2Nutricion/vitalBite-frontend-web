import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LucideX } from '@lucide/angular';
import { Appointment } from '../../../../core/models/vitalbite.models';

@Component({
  selector: 'app-cancel-appointment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, LucideX],
  template: `
    <app-modal
      [open]="open"
      title="Cancelar cita"
      eyebrow="AGENDA NUTRICIONAL"
      (close)="closeModal()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-grid appointments-modal-grid">
          <label class="field wide">
            <span>Motivo de cancelacion</span>
            <textarea rows="3" formControlName="reason"></textarea>
          </label>
        </div>
        <div class="actions">
          <button class="btn secondary" type="button" (click)="closeModal()">
            Volver
          </button>
          <button class="btn" type="submit">
            <svg lucideX size="16"></svg>
            Confirmar cancelacion
          </button>
        </div>
      </form>
    </app-modal>
  `
})
export class CancelAppointmentModalComponent {
  @Input() open = false;
  @Input() appointment: Appointment | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ reason: string }>();

  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    reason: [
      'Reprogramada por solicitud del paciente',
      [Validators.required, Validators.minLength(1)],
    ],
  });

  ngOnChanges() {
    if (this.open && this.appointment) {
      this.form.reset({
        reason: this.appointment.cancelReason ?? 'Cancelada por coordinacion de agenda',
      });
    }
  }

  closeModal() {
    this.close.emit();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirm.emit({ reason: this.form.controls.reason.value });
  }
}
