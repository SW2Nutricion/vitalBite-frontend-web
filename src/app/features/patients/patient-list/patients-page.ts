import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideArchive, LucideFilter, LucidePlus, LucideSearch, LucideUsers } from '@lucide/angular';
import { CreatePatientInput, Patient, PatientStatus } from '../../../core/models/vitalbite.models';
import { PatientsService } from '../../../core/services/patients.service';
import { SessionService } from '../../../core/services/session.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-patients-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ModalComponent,
    LucideArchive,
    LucideFilter,
    LucidePlus,
    LucideSearch,
    LucideUsers,
  ],
  templateUrl: './patients-page.html',
})
export class PatientsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly patients = signal<Patient[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modalOpen = signal(false);
  readonly editing = signal<Patient | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: ['' as '' | PatientStatus],
  });

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [''],
    phone: [''],
    birthDate: [''],
    gender: ['NOT_SPECIFIED'],
    nutritionGoal: [''],
    clinicalNotes: [''],
    status: ['ACTIVE' as PatientStatus],
  });

  readonly activeCount = computed(() => this.patients().filter((p) => p.status === 'ACTIVE').length);
  readonly inactiveCount = computed(() => this.patients().filter((p) => p.status === 'INACTIVE').length);
  readonly archivedCount = computed(() => this.patients().filter((p) => p.status === 'ARCHIVED').length);

  constructor(
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
      this.patients.set(
        await this.patientsService.list({
          search,
          status: status || null,
        }),
      );
    } catch {
      this.error.set('No se pudo cargar el listado de pacientes.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.editing.set(null);
    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      birthDate: '',
      gender: 'NOT_SPECIFIED',
      nutritionGoal: '',
      clinicalNotes: '',
      status: 'ACTIVE',
    });
    this.modalOpen.set(true);
  }

  openEdit(patient: Patient) {
    this.editing.set(patient);
    this.form.reset({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email ?? '',
      phone: patient.phone ?? '',
      birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
      gender: patient.gender ?? 'NOT_SPECIFIED',
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
    const input: CreatePatientInput = {
      ...raw,
      birthDate: raw.birthDate ? new Date(raw.birthDate).toISOString() : null,
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
    return status === 'ACTIVE' ? 'Activo' : status === 'INACTIVE' ? 'Inactivo' : 'Archivado';
  }
}
