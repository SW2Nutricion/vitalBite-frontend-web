import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArchive,
  LucideCalendarDays,
  LucideChevronDown,
  LucideClipboardCheck,
  LucideMail,
  LucidePhone,
  LucideSearch,
  LucideStethoscope,
  LucideTarget,
  LucideUserRound,
  LucideUserRoundPlus,
  LucideUsers,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, map, merge, startWith } from 'rxjs';
import {
  Appointment,
  CreatePatientInput,
  Gender,
  Patient,
  PatientStatus,
} from '../../../core/models/vitalbite.models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { PatientsService } from '../../../core/services/patients.service';
import { SessionService } from '../../../core/services/session.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

type RegisterFilter = '' | 'TODAY' | 'WEEK' | 'MONTH';
type PatientFiltersValue = {
  search: string;
  status: '' | PatientStatus;
  register: RegisterFilter;
};

@Component({
  selector: 'app-patients-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ModalComponent,
    LucideArchive,
    LucideCalendarDays,
    LucideChevronDown,
    LucideClipboardCheck,
    LucideMail,
    LucidePhone,
    LucideSearch,
    LucideStethoscope,
    LucideTarget,
    LucideUserRound,
    LucideUserRoundPlus,
    LucideUsers,
  ],
  templateUrl: './patients-page.html',
})
export class PatientsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private patientRequestId = 0;
  readonly patients = signal<Patient[]>([]);
  readonly statusTotals = signal<Record<PatientStatus, number>>({
    ACTIVE: 0,
    INACTIVE: 0,
    ARCHIVED: 0,
  });
  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modalOpen = signal(false);
  readonly editing = signal<Patient | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: ['' as '' | PatientStatus],
    register: ['' as RegisterFilter],
  });
  readonly filterValues = toSignal(
    this.filters.valueChanges.pipe(
      startWith(this.filters.getRawValue()),
      map((value): PatientFiltersValue => ({
        search: value.search ?? '',
        status: (value.status ?? '') as '' | PatientStatus,
        register: (value.register ?? '') as RegisterFilter,
      })),
    ),
    {
      initialValue: this.filters.getRawValue() as PatientFiltersValue,
    },
  );

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: [''],
    phone: [''],
    birthDate: [''],
    gender: ['' as '' | Gender],
    activityLevel: [2],
    dietQualityScore: [5],
    comorbiditiesCount: [0],
    nutritionGoal: [''],
    clinicalNotes: [''],
    status: ['ACTIVE' as PatientStatus],
  });

  readonly visiblePatients = computed(() =>
    this.patients().filter((patient) => this.matchesRegisterFilter(patient)),
  );
  readonly activeCount = computed(() => this.statusTotals().ACTIVE);
  readonly inactiveCount = computed(() => this.statusTotals().INACTIVE);
  readonly archivedCount = computed(() => this.statusTotals().ARCHIVED);
  readonly followUpCount = computed(
    () =>
      this.appointments().filter((appointment) =>
        ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status),
      ).length,
  );

  constructor(
    private readonly patientsService: PatientsService,
    private readonly appointmentsService: AppointmentsService,
    readonly session: SessionService,
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadSummary(), this.loadPatients(this.currentServerFilters())]);
    this.observeServerFilters();
  }

  async load() {
    await Promise.all([this.loadSummary(), this.loadPatients(this.currentServerFilters())]);
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({
      fullName: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: '',
      activityLevel: 2,
      dietQualityScore: 5,
      comorbiditiesCount: 0,
      nutritionGoal: '',
      clinicalNotes: '',
      status: 'ACTIVE',
    });
    this.modalOpen.set(true);
  }

  openEdit(patient: Patient) {
    this.editing.set(patient);
    this.form.reset({
      fullName: patient.fullName,
      email: patient.email ?? '',
      phone: patient.phone ?? '',
      birthDate: this.birthDateInputValue(patient.birthDate),
      gender: patient.gender ?? '',
      activityLevel: patient.activityLevel ?? 2,
      dietQualityScore: patient.dietQualityScore ?? 5,
      comorbiditiesCount: patient.comorbiditiesCount ?? 0,
      nutritionGoal: patient.nutritionGoal ?? '',
      clinicalNotes: patient.clinicalNotes ?? '',
      status: patient.status,
    });
    this.modalOpen.set(true);
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const { firstName, lastName } = this.splitFullName(raw.fullName);
    const input: CreatePatientInput = {
      firstName,
      lastName,
      email: raw.email,
      phone: raw.phone,
      birthDate: this.birthDatePayload(raw.birthDate),
      gender: raw.gender || null,
      activityLevel: Number(raw.activityLevel),
      dietQualityScore: Number(raw.dietQualityScore),
      comorbiditiesCount: Number(raw.comorbiditiesCount),
      nutritionGoal: raw.nutritionGoal,
      clinicalNotes: raw.clinicalNotes,
      status: raw.status,
      nutritionistId: this.session.user()?.id ?? null,
    } as CreatePatientInput;

    if (this.editing()) {
      await this.patientsService.update(this.editing()!.id, input);
    } else {
      await this.patientsService.create(input);
    }

    this.modalOpen.set(false);
    await this.load();
  }

  async archive(patient: Patient) {
    await this.patientsService.archive(patient.id);
    await this.load();
  }

  statusLabel(status: PatientStatus) {
    return status === 'ACTIVE' ? 'Activo' : status === 'INACTIVE' ? 'Desactivado' : 'Pendiente';
  }

  statusBadgeClass(status: PatientStatus) {
    return status === 'ACTIVE' ? '' : status === 'INACTIVE' ? 'danger' : 'warning';
  }

  latestAppointmentLabel(patientId: string) {
    const appointment = this.latestAppointment(patientId);
    return appointment ? this.relativeDate(appointment.scheduledAt) : 'Sin cita';
  }

  private latestAppointment(patientId: string) {
    return [...this.appointments()]
      .filter((appointment) => appointment.patientId === patientId)
      .sort(
        (current, next) =>
          new Date(next.scheduledAt).getTime() - new Date(current.scheduledAt).getTime(),
      )[0];
  }

  private relativeDate(value: string) {
    const date = new Date(value);
    const today = new Date();
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dateStart.getTime() - todayStart.getTime()) / 86_400_000);

    if (diffDays === 0) {
      return `Hoy ${new Intl.DateTimeFormat('es-BO', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)}`;
    }

    if (diffDays === -1) return 'Ayer';

    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  private matchesRegisterFilter(patient: Patient) {
    const { register } = this.filterValues();
    if (!register) return true;

    const createdAt = new Date(patient.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000);

    return (
      (register === 'TODAY' && diffDays <= 0) ||
      (register === 'WEEK' && diffDays <= 7) ||
      (register === 'MONTH' && diffDays <= 30)
    );
  }

  private observeServerFilters() {
    const searchChanges$ = this.filters.controls.search.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    );
    const statusChanges$ = this.filters.controls.status.valueChanges.pipe(distinctUntilChanged());

    merge(searchChanges$, statusChanges$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.loadPatients(this.currentServerFilters());
      });
  }

  private currentServerFilters() {
    const { search, status } = this.filterValues();

    return {
      search,
      status,
    };
  }

  private async loadSummary() {
    this.error.set('');
    try {
      const [active, inactive, archived, appointments] = await Promise.all([
        this.patientsService.list({ status: 'ACTIVE' }),
        this.patientsService.list({ status: 'INACTIVE' }),
        this.patientsService.list({ status: 'ARCHIVED' }),
        this.appointmentsService.calendar().catch(() => []),
      ]);

      this.statusTotals.set({
        ACTIVE: active.length,
        INACTIVE: inactive.length,
        ARCHIVED: archived.length,
      });
      this.appointments.set(appointments);
    } catch {
      this.error.set('No se pudo cargar el listado de pacientes.');
    }
  }

  private async loadPatients(filters: Pick<PatientFiltersValue, 'search' | 'status'>) {
    const requestId = ++this.patientRequestId;
    this.loading.set(true);
    this.error.set('');

    try {
      const patients = await this.patientsService.list({
        search: filters.search,
        status: filters.status || null,
      });

      if (requestId !== this.patientRequestId) {
        return;
      }

      this.patients.set(patients);
    } catch {
      if (requestId !== this.patientRequestId) {
        return;
      }

      this.error.set('No se pudo cargar el listado de pacientes.');
    } finally {
      if (requestId === this.patientRequestId) {
        this.loading.set(false);
      }
    }
  }

  private splitFullName(fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts.shift() ?? '';
    const lastName = parts.join(' ') || firstName;

    return {
      firstName,
      lastName,
    };
  }

  private birthDateInputValue(value?: string | null) {
    return value ? value.slice(0, 10) : '';
  }

  private birthDatePayload(value: string) {
    return value ? `${value}T00:00:00.000Z` : null;
  }
}
