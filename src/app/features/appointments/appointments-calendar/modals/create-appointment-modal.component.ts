import { Component, EventEmitter, inject, Input, Output, SimpleChanges, OnChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LucidePlus } from '@lucide/angular';
import { Patient, AppointmentStatus } from '../../../../core/models/vitalbite.models';

@Component({
  selector: 'app-create-appointment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, LucidePlus],
  template: `
    <app-modal
      [open]="open"
      title="Nueva cita"
      eyebrow="AGENDA NUTRICIONAL"
      (close)="closeModal()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-grid appointments-modal-grid">
          @if (lockedPatientContext) {
            <label class="field wide">
              <span>Paciente</span>
              <input [value]="patientName || 'Paciente actual'" readonly />
            </label>
          } @else {
            <label class="field wide">
              <span>Paciente</span>
              <select formControlName="patientId">
                @for (patient of patients; track patient.id) {
                  <option [value]="patient.id">{{ patient.fullName }}</option>
                }
              </select>
            </label>
          }
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
          <label class="field">
            <span>Modalidad</span>
            <select formControlName="mode">
              <option value="IN_PERSON">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
            </select>
          </label>
          <label class="field">
            <span>Estado inicial</span>
            <select formControlName="status">
              <option value="SCHEDULED">Programada</option>
              <option value="CONFIRMED">Confirmada</option>
            </select>
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
            Cancelar
          </button>
          <button class="btn" type="submit">
            <svg lucidePlus size="16"></svg>
            Guardar cita
          </button>
        </div>
      </form>
    </app-modal>
  `
})
export class CreateAppointmentModalComponent implements OnChanges {
  @Input() open = false;
  @Input() lockedPatientContext = false;
  @Input() patientName: string | null = null;
  @Input() patients: Patient[] = [];
  @Input() initialPatientId = '';
  @Input() initialDate = new Date();
  
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{
    patientId: string;
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes: number;
    mode: 'IN_PERSON' | 'VIRTUAL';
    reason: string;
    notes: string;
    status: AppointmentStatus;
  }>();

  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    patientId: ['', Validators.required],
    scheduledDate: ['', Validators.required],
    scheduledTime: ['09:00', Validators.required],
    durationMinutes: [45, [Validators.required, Validators.min(1)]],
    mode: ['IN_PERSON' as 'IN_PERSON' | 'VIRTUAL'],
    reason: ['Consulta nutricional'],
    notes: [''],
    status: ['SCHEDULED' as AppointmentStatus],
  });

  ngOnChanges(changes: SimpleChanges) {
    if (this.open && changes['open']?.currentValue === true) {
      this.form.reset({
        patientId: this.initialPatientId,
        scheduledDate: this.dateInputValue(this.initialDate),
        scheduledTime: '09:00',
        durationMinutes: 45,
        mode: 'IN_PERSON',
        reason: 'Consulta nutricional',
        notes: '',
        status: 'SCHEDULED',
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
}
