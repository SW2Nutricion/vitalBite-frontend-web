import { Component, EventEmitter, inject, Input, Output, SimpleChanges, OnChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LucideRotateCw } from '@lucide/angular';
import { Appointment } from '../../../../core/models/vitalbite.models';

@Component({
  selector: 'app-reschedule-appointment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, LucideRotateCw],
  template: `
    <app-modal
      [open]="open"
      title="Reprogramar cita"
      eyebrow="AGENDA NUTRICIONAL"
      (close)="closeModal()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-grid appointments-modal-grid">
          <label class="field">
            <span>Fecha</span>
            <input type="date" formControlName="scheduledDate" />
          </label>
          <label class="field">
            <span>Hora</span>
            <input type="time" formControlName="scheduledTime" />
          </label>
          <label class="field">
            <span>Duracion</span>
            <input type="number" min="1" formControlName="durationMinutes" />
          </label>
          <label class="field wide">
            <span>Motivo</span>
            <input formControlName="reason" />
          </label>
          <label class="field wide">
            <span>Observaciones</span>
            <textarea rows="3" formControlName="notes"></textarea>
          </label>
        </div>
        <div class="actions">
          <button class="btn secondary" type="button" (click)="closeModal()">
            Cerrar
          </button>
          <button class="btn" type="submit">
            <svg lucideRotateCw size="16"></svg>
            Guardar cambios
          </button>
        </div>
      </form>
    </app-modal>
  `
})
export class RescheduleAppointmentModalComponent implements OnChanges {
  @Input() open = false;
  @Input() appointment: Appointment | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes: number;
    reason: string;
    notes: string;
  }>();

  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    scheduledDate: ['', Validators.required],
    scheduledTime: ['09:00', Validators.required],
    durationMinutes: [45, [Validators.required, Validators.min(1)]],
    reason: [''],
    notes: [''],
  });

  ngOnChanges(changes: SimpleChanges) {
    if (this.open && this.appointment && changes['open']?.currentValue === true) {
      const appointmentDate = new Date(this.appointment.scheduledAt);
      this.form.reset({
        scheduledDate: this.dateInputValue(appointmentDate),
        scheduledTime: this.timeInputValue(appointmentDate),
        durationMinutes: this.appointment.durationMinutes,
        reason: this.appointment.reason ?? '',
        notes: this.appointment.notes ?? '',
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
    
    this.confirm.emit(this.form.getRawValue());
  }

  private dateInputValue(date: Date) {
    return date.toISOString().split('T')[0];
  }

  private timeInputValue(date: Date) {
    const d = new Date(date);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
