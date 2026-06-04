import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideCalendarDays,
  LucideCheck,
  LucideClock,
  LucidePlus,
  LucideRotateCw,
  LucideX,
} from '@lucide/angular';
import { appointmentStatusLabel } from '../../core/models/status-labels';
import { Appointment, AppointmentStatus, Patient } from '../../core/models/vitalbite.models';
import { AppointmentsService } from '../../core/services/appointments.service';
import { PatientsService } from '../../core/services/patients.service';
import { SessionService } from '../../core/services/session.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-appointments-page',
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    LucideCalendarDays,
    LucideCheck,
    LucideClock,
    LucidePlus,
    LucideRotateCw,
    LucideX,
  ],
  templateUrl: './appointments-page.html',
})
export class AppointmentsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly appointments = signal<Appointment[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modalOpen = signal(false);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: ['' as '' | AppointmentStatus],
  });

  readonly form = this.fb.nonNullable.group({
    patientId: ['', Validators.required],
    scheduledDate: [this.today(), Validators.required],
    scheduledTime: ['09:00', Validators.required],
    durationMinutes: [45, [Validators.required, Validators.min(1)]],
    mode: ['IN_PERSON'],
    reason: ['Consulta nutricional'],
    notes: [''],
    status: ['SCHEDULED' as AppointmentStatus],
  });

  readonly activeCount = computed(
    () =>
      this.appointments().filter((appointment) =>
        ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status),
      ).length,
  );
  readonly confirmedCount = computed(
    () => this.appointments().filter((appointment) => appointment.status === 'CONFIRMED').length,
  );
  readonly cancelledCount = computed(
    () => this.appointments().filter((appointment) => appointment.status === 'CANCELLED').length,
  );

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly patientsService: PatientsService,
    readonly session: SessionService,
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const { search, status } = this.filters.getRawValue();
      const [appointments, patients] = await Promise.all([
        this.appointmentsService.calendar({ search, status: status || null }),
        this.patientsService.list(),
      ]);
      this.appointments.set(appointments);
      this.patients.set(patients);
      if (!this.form.controls.patientId.value && patients[0]) {
        this.form.controls.patientId.setValue(patients[0].id);
      }
    } catch {
      this.error.set('No se pudo cargar la agenda.');
    } finally {
      this.loading.set(false);
    }
  }

  async create() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    await this.appointmentsService.create({
      patientId: raw.patientId,
      nutritionistId: this.session.user()?.id ?? '',
      scheduledAt: new Date(`${raw.scheduledDate}T${raw.scheduledTime}:00`).toISOString(),
      durationMinutes: Number(raw.durationMinutes),
      mode: raw.mode as 'IN_PERSON' | 'VIRTUAL',
      reason: raw.reason,
      notes: raw.notes,
      status: raw.status,
    });

    this.modalOpen.set(false);
    await this.load();
  }

  async confirm(id: string) {
    await this.appointmentsService.confirm(id);
    await this.load();
  }

  async complete(id: string) {
    await this.appointmentsService.complete(id);
    await this.load();
  }

  async cancel(id: string) {
    await this.appointmentsService.cancel(id);
    await this.load();
  }

  async noShow(id: string) {
    await this.appointmentsService.noShow(id);
    await this.load();
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  badgeClass(status: AppointmentStatus) {
    return status === 'CANCELLED' || status === 'NO_SHOW'
      ? 'danger'
      : status === 'SCHEDULED' || status === 'RESCHEDULED'
        ? 'warning'
        : '';
  }

  statusLabel = appointmentStatusLabel;

  private today() {
    return new Date().toISOString().slice(0, 10);
  }
}
