import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideChevronDown,
  LucideClock,
  LucidePlus,
  LucideRotateCw,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, map, merge, startWith } from 'rxjs';
import { appointmentStatusLabel } from '../../../core/models/status-labels';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  Patient,
} from '../../../core/models/vitalbite.models';
import { AppointmentsService } from '../../../core/services/appointments.service';
import { PatientsService } from '../../../core/services/patients.service';
import { SessionService } from '../../../core/services/session.service';
import { CancelAppointmentModalComponent } from './modals/cancel-appointment-modal.component';
import { RescheduleAppointmentModalComponent } from './modals/reschedule-appointment-modal.component';
import { CreateAppointmentModalComponent } from './modals/create-appointment-modal.component';

type CalendarViewMode = 'DAY' | 'WEEK' | 'MONTH';
type AppointmentFiltersValue = {
  search: string;
  status: '' | AppointmentStatus;
};
type CalendarDayColumn = {
  key: string;
  date: Date;
  title: string;
  subtitle: string;
  appointments: Appointment[];
  isToday: boolean;
};
type CalendarMonthCell = {
  key: string;
  date: Date;
  dayNumber: string;
  appointments: Appointment[];
  isCurrentMonth: boolean;
  isToday: boolean;
};

@Component({
  selector: 'app-appointments-calendar',
  imports: [
    ReactiveFormsModule,
    CancelAppointmentModalComponent,
    RescheduleAppointmentModalComponent,
    CreateAppointmentModalComponent,
    LucideChevronDown,
    LucideClock,
    LucideSearch,
  ],
  templateUrl: './appointments-calendar.component.html',
})
export class AppointmentsCalendarComponent implements OnInit, OnChanges {
  @Input() patientId: string | null = null;
  @Input() patientName: string | null = null;
  @Input() embedded = false;
  @Input() initialViewMode: CalendarViewMode = 'WEEK';

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private agendaRequestId = 0;
  private initialized = false;

  readonly appointments = signal<Appointment[]>([]);
  readonly scopedAppointments = signal<Appointment[]>([]);
  readonly todayAppointments = signal<Appointment[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly successMessage = signal('');
  readonly modalOpen = signal(false);
  readonly rescheduleModalOpen = signal(false);
  readonly cancelModalOpen = signal(false);
  readonly viewMode = signal<CalendarViewMode>('WEEK');
  readonly referenceDate = signal(this.startOfDay(new Date()));
  readonly selectedAppointmentId = signal<string | null>(null);

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: ['' as '' | AppointmentStatus],
  });
  readonly filterValues = toSignal(
    this.filters.valueChanges.pipe(
      startWith(this.filters.getRawValue()),
      map((value): AppointmentFiltersValue => ({
        search: value.search ?? '',
        status: (value.status ?? '') as '' | AppointmentStatus,
      })),
    ),
    {
      initialValue: this.filters.getRawValue() as AppointmentFiltersValue,
    },
  );

  readonly selectedAppointment = computed(
    () =>
      this.appointments().find(
        (appointment) => appointment.id === this.selectedAppointmentId(),
      ) ?? null,
  );
  readonly dayColumns = computed(() => this.buildDayColumns());
  readonly monthCells = computed(() => this.buildMonthCells());
  readonly currentRangeTitle = computed(() => {
    const mode = this.viewMode();
    return mode === 'DAY'
      ? 'Calendario diario'
      : mode === 'WEEK'
        ? 'Calendario semanal'
        : 'Calendario mensual';
  });
  readonly currentRangeChipLabel = computed(() => {
    const mode = this.viewMode();
    return mode === 'DAY' ? 'Hoy' : mode === 'WEEK' ? 'Esta semana' : 'Este mes';
  });
  readonly currentRangeBadge = computed(() =>
    this.rangeBadgeText(this.viewMode(), this.referenceDate()),
  );
  readonly todayTotal = computed(() => this.todayAppointments().length);
  readonly todayConfirmed = computed(
    () =>
      this.todayAppointments().filter(
        (appointment) => appointment.status === 'CONFIRMED',
      ).length,
  );
  readonly todayPending = computed(
    () =>
      this.todayAppointments().filter((appointment) =>
        ['SCHEDULED', 'RESCHEDULED'].includes(appointment.status),
      ).length,
  );
  readonly selectedAppointmentStatusLabel = computed(() =>
    appointmentStatusLabel(this.selectedAppointment()?.status),
  );
  readonly canConfirmSelected = computed(() => {
    const status = this.selectedAppointment()?.status;
    return !!status && ['SCHEDULED', 'RESCHEDULED'].includes(status);
  });
  readonly canRescheduleSelected = computed(() => {
    const status = this.selectedAppointment()?.status;
    return !!status && !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(status);
  });
  readonly canCancelSelected = computed(() => {
    const status = this.selectedAppointment()?.status;
    return !!status && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(status);
  });

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly patientsService: PatientsService,
    readonly session: SessionService,
  ) {}

  async ngOnInit() {
    this.viewMode.set(this.initialViewMode);
    await this.bootstrap();
    this.observeFilters();
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.initialized) return;

    if (changes['initialViewMode'] && !changes['initialViewMode'].firstChange) {
      this.viewMode.set(this.initialViewMode);
    }

    if (
      changes['patientId'] ||
      changes['patientName'] ||
      changes['embedded'] ||
      changes['initialViewMode']
    ) {
      void this.bootstrap();
    }
  }

  openCreate() {
    this.successMessage.set('');
    this.modalOpen.set(true);
  }

  async create(raw: any) {
    const input: CreateAppointmentInput = {
      patientId: this.patientId ?? raw.patientId,
      nutritionistId: this.session.user()?.id ?? '',
      scheduledAt: this.toIsoDateTime(raw.scheduledDate, raw.scheduledTime),
      durationMinutes: Number(raw.durationMinutes),
      mode: raw.mode,
      reason: raw.reason,
      notes: raw.notes,
      status: raw.status,
    };

    await this.runAppointmentAction(
      () => this.appointmentsService.create(input),
      'Cita creada correctamente.',
      () => this.modalOpen.set(false),
    );
  }

  openReschedule() {
    const appointment = this.selectedAppointment();
    if (!appointment) return;

    this.successMessage.set('');
    this.rescheduleModalOpen.set(true);
  }

  async rescheduleSelected(raw: any) {
    const appointment = this.selectedAppointment();
    if (!appointment) return;

    await this.runAppointmentAction(
      () =>
        this.appointmentsService.reschedule(appointment.id, {
          scheduledAt: this.toIsoDateTime(raw.scheduledDate, raw.scheduledTime),
          durationMinutes: Number(raw.durationMinutes),
          reason: raw.reason || null,
          notes: raw.notes || null,
        }),
      'Cita reprogramada correctamente.',
      () => this.rescheduleModalOpen.set(false),
    );
  }

  openCancel() {
    const appointment = this.selectedAppointment();
    if (!appointment) return;

    this.successMessage.set('');
    this.cancelModalOpen.set(true);
  }

  async cancelSelected(event: { reason: string }) {
    const appointment = this.selectedAppointment();
    if (!appointment) return;

    await this.runAppointmentAction(
      () =>
        this.appointmentsService.cancel(
          appointment.id,
          event.reason,
        ),
      'Cita cancelada correctamente.',
      () => this.cancelModalOpen.set(false),
    );
  }

  async confirmSelected() {
    const appointment = this.selectedAppointment();
    if (!appointment) return;

    await this.runAppointmentAction(
      () => this.appointmentsService.confirm(appointment.id),
      'Cita confirmada correctamente.',
    );
  }

  async jumpToCurrentRange() {
    this.referenceDate.set(this.startOfDay(new Date()));
    if (this.isPatientScoped()) {
      this.applyPatientScopedFilters();
      return;
    }
    await this.loadGlobalAgenda(this.currentServerFilters());
  }

  async setViewMode(mode: CalendarViewMode) {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);

    if (this.isPatientScoped()) {
      this.applyPatientScopedFilters();
      return;
    }

    await this.loadGlobalAgenda(this.currentServerFilters());
  }

  selectAppointment(appointmentId: string) {
    this.selectedAppointmentId.set(appointmentId);
  }

  appointmentTone(status: AppointmentStatus) {
    if (status === 'CONFIRMED' || status === 'COMPLETED') return 'success';
    if (status === 'SCHEDULED') return 'warning';
    if (['RESCHEDULED', 'CANCELLED', 'NO_SHOW'].includes(status)) return 'danger';
    return 'muted';
  }

  isSelectedAppointment(appointmentId: string) {
    return this.selectedAppointmentId() === appointmentId;
  }

  isPatientScoped() {
    return !!this.patientId;
  }

  lockedPatientContext() {
    return this.embedded && this.isPatientScoped();
  }

  formatTime(value: string) {
    return new Intl.DateTimeFormat('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  appointmentDateLabel(value: string) {
    return new Intl.DateTimeFormat('es-BO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  selectedPatientName() {
    return (
      this.selectedAppointment()?.patientFullName ??
      this.patientName ??
      'Sin cita seleccionada'
    );
  }

  selectedReason() {
    return (
      this.selectedAppointment()?.reason ??
      'Selecciona una cita desde el calendario para confirmar, reprogramar o cancelar.'
    );
  }

  selectedDurationLabel() {
    const appointment = this.selectedAppointment();
    return appointment ? `${appointment.durationMinutes} min` : 'Pendiente';
  }

  monthHiddenCount(count: number) {
    return count > 2 ? `+${count - 2}` : '';
  }

  trackByDayKey(_: number, column: CalendarDayColumn) {
    return column.key;
  }

  trackByMonthKey(_: number, cell: CalendarMonthCell) {
    return cell.key;
  }

  statusLabel = appointmentStatusLabel;

  private async bootstrap() {
    await Promise.all([this.loadPatients(), this.refreshAgenda()]);
  }

  private observeFilters() {
    const searchChanges$ = this.filters.controls.search.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    );
    const statusChanges$ = this.filters.controls.status.valueChanges.pipe(
      distinctUntilChanged(),
    );

    merge(searchChanges$, statusChanges$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.isPatientScoped()) {
          this.applyPatientScopedFilters();
          return;
        }

        void this.loadGlobalAgenda(this.currentServerFilters());
      });
  }

  private currentServerFilters() {
    const { search, status } = this.filterValues();
    const range = this.rangeBounds(this.viewMode(), this.referenceDate());

    return {
      search,
      status,
      dateFrom: range.start.toISOString(),
      dateTo: range.end.toISOString(),
    };
  }

  private async loadPatients() {
    if (this.isPatientScoped()) {
      this.patients.set([]);
      return;
    }

    const patients = await this.patientsService.list();
    this.patients.set(patients);
  }

  private async refreshAgenda() {
    if (this.isPatientScoped()) {
      await this.loadPatientAgenda();
      return;
    }

    await this.loadGlobalAgenda(this.currentServerFilters());
  }

  private async loadPatientAgenda() {
    if (!this.patientId) {
      this.appointments.set([]);
      this.scopedAppointments.set([]);
      this.todayAppointments.set([]);
      this.selectedAppointmentId.set(null);
      return;
    }

    const requestId = ++this.agendaRequestId;
    this.loading.set(true);
    this.error.set('');

    try {
      const appointments = await this.appointmentsService.byPatient(this.patientId);

      if (requestId !== this.agendaRequestId) {
        return;
      }

      this.scopedAppointments.set(appointments);
      this.todayAppointments.set(this.filterTodayAppointments(appointments));
      this.applyPatientScopedFilters();
    } catch {
      if (requestId !== this.agendaRequestId) {
        return;
      }

      this.error.set('No se pudo cargar la agenda.');
      this.appointments.set([]);
      this.scopedAppointments.set([]);
      this.todayAppointments.set([]);
      this.selectedAppointmentId.set(null);
    } finally {
      if (requestId === this.agendaRequestId) {
        this.loading.set(false);
      }
    }
  }

  private applyPatientScopedFilters() {
    const { search, status } = this.filterValues();
    const range = this.rangeBounds(this.viewMode(), this.referenceDate());
    const searchValue = search.trim().toLowerCase();

    const appointments = this.scopedAppointments()
      .filter((appointment) => {
        const appointmentDate = new Date(appointment.scheduledAt).getTime();
        const inRange =
          appointmentDate >= range.start.getTime() &&
          appointmentDate <= range.end.getTime();
        const matchesStatus = !status || appointment.status === status;
        const matchesSearch =
          !searchValue ||
          [
            appointment.patientFullName,
            appointment.reason ?? '',
            appointment.notes ?? '',
            appointment.nutritionistFullName,
          ]
            .join(' ')
            .toLowerCase()
            .includes(searchValue);

        return inRange && matchesStatus && matchesSearch;
      })
      .sort(
        (current, next) =>
          new Date(current.scheduledAt).getTime() -
          new Date(next.scheduledAt).getTime(),
      );

    this.appointments.set(appointments);
    this.ensureSelectedAppointment();
  }

  private filterTodayAppointments(appointments: Appointment[]) {
    return appointments.filter((appointment) =>
      this.sameDay(new Date(appointment.scheduledAt), new Date()),
    );
  }

  private async loadGlobalAgenda(filters: {
    search: string;
    status: '' | AppointmentStatus;
    dateFrom: string;
    dateTo: string;
  }) {
    const requestId = ++this.agendaRequestId;
    this.loading.set(true);
    this.error.set('');

    try {
      const todayRange = this.rangeBounds('DAY', this.startOfDay(new Date()));
      const [agendaAppointments, todayAppointments] = await Promise.all([
        this.appointmentsService.calendar({
          search: filters.search,
          status: filters.status || null,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        }),
        this.appointmentsService.calendar({
          dateFrom: todayRange.start.toISOString(),
          dateTo: todayRange.end.toISOString(),
        }),
      ]);

      if (requestId !== this.agendaRequestId) {
        return;
      }

      this.appointments.set(agendaAppointments);
      this.todayAppointments.set(todayAppointments);
      this.ensureSelectedAppointment();
    } catch {
      if (requestId !== this.agendaRequestId) {
        return;
      }

      this.error.set('No se pudo cargar la agenda.');
      this.appointments.set([]);
      this.todayAppointments.set([]);
      this.selectedAppointmentId.set(null);
    } finally {
      if (requestId === this.agendaRequestId) {
        this.loading.set(false);
      }
    }
  }

  private ensureSelectedAppointment() {
    const currentId = this.selectedAppointmentId();
    if (
      currentId &&
      this.appointments().some((appointment) => appointment.id === currentId)
    ) {
      return;
    }

    this.selectedAppointmentId.set(this.appointments()[0]?.id ?? null);
  }

  private buildDayColumns() {
    if (this.viewMode() === 'MONTH') return [];

    const range =
      this.viewMode() === 'DAY'
        ? [this.startOfDay(this.referenceDate())]
        : this.daysBetween(
            this.startOfWeek(this.referenceDate()),
            this.endOfWeek(this.referenceDate()),
          );

    return range.map((date) => ({
      key: this.dateKey(date),
      date,
      title:
        this.viewMode() === 'DAY'
          ? new Intl.DateTimeFormat('es-BO', {
              weekday: 'long',
              day: 'numeric',
            }).format(date)
          : `${this.weekdayShort(date)} ${date.getDate()}`,
      subtitle: this.isToday(date)
        ? 'Hoy'
        : new Intl.DateTimeFormat('es-BO', { month: 'short' }).format(date),
      appointments: this.appointmentsForDate(date),
      isToday: this.isToday(date),
    }));
  }

  private buildMonthCells() {
    if (this.viewMode() !== 'MONTH') return [];

    const monthStart = this.startOfMonth(this.referenceDate());
    const gridStart = this.startOfWeek(monthStart);
    const monthEnd = this.endOfMonth(this.referenceDate());
    const gridEnd = this.endOfWeek(monthEnd);

    return this.daysBetween(gridStart, gridEnd).map((date) => ({
      key: this.dateKey(date),
      date,
      dayNumber: String(date.getDate()),
      appointments: this.appointmentsForDate(date),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: this.isToday(date),
    }));
  }

  private appointmentsForDate(date: Date) {
    return this.appointments()
      .filter((appointment) =>
        this.sameDay(new Date(appointment.scheduledAt), date),
      )
      .sort(
        (current, next) =>
          new Date(current.scheduledAt).getTime() -
          new Date(next.scheduledAt).getTime(),
      );
  }

  private rangeBounds(mode: CalendarViewMode, referenceDate: Date) {
    if (mode === 'DAY') {
      return {
        start: this.startOfDay(referenceDate),
        end: this.endOfDay(referenceDate),
      };
    }

    if (mode === 'WEEK') {
      return {
        start: this.startOfDay(this.startOfWeek(referenceDate)),
        end: this.endOfDay(this.endOfWeek(referenceDate)),
      };
    }

    const monthStart = this.startOfWeek(this.startOfMonth(referenceDate));
    const monthEnd = this.endOfWeek(this.endOfMonth(referenceDate));

    return {
      start: this.startOfDay(monthStart),
      end: this.endOfDay(monthEnd),
    };
  }

  private rangeBadgeText(mode: CalendarViewMode, referenceDate: Date) {
    if (mode === 'DAY') {
      return new Intl.DateTimeFormat('es-BO', {
        day: 'numeric',
        month: 'short',
      }).format(referenceDate);
    }

    if (mode === 'WEEK') {
      const start = this.startOfWeek(referenceDate);
      const end = this.endOfWeek(referenceDate);
      const startLabel = new Intl.DateTimeFormat('es-BO', {
        day: 'numeric',
      }).format(start);
      const endLabel = new Intl.DateTimeFormat('es-BO', {
        day: 'numeric',
        month: 'short',
      }).format(end);
      return `${startLabel} - ${endLabel}`;
    }

    return new Intl.DateTimeFormat('es-BO', {
      month: 'long',
      year: 'numeric',
    }).format(referenceDate);
  }

  private weekdayShort(date: Date) {
    const value = new Intl.DateTimeFormat('es-BO', {
      weekday: 'short',
    }).format(date);

    return value.charAt(0).toUpperCase() + value.slice(1).replace('.', '');
  }

  private slotTimeLabel(hour: number, minute: number) {
    return new Intl.DateTimeFormat('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(2026, 5, 5, hour, minute));
  }

  private startOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private endOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  }

  private startOfWeek(date: Date) {
    const value = this.startOfDay(date);
    const day = value.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    value.setDate(value.getDate() + diff);
    return value;
  }

  private endOfWeek(date: Date) {
    const value = this.startOfWeek(date);
    value.setDate(value.getDate() + 6);
    return this.endOfDay(value);
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private endOfMonth(date: Date) {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  private daysBetween(start: Date, end: Date) {
    const days: Date[] = [];
    const current = this.startOfDay(start);
    const finish = this.startOfDay(end);

    while (current.getTime() <= finish.getTime()) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  private sameDay(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  private isToday(date: Date) {
    return this.sameDay(date, new Date());
  }

  private dateKey(date: Date) {
    return this.dateInputValue(date);
  }

  private dateInputValue(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private timeInputValue(date: Date) {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private toIsoDateTime(date: string, time: string) {
    return new Date(`${date}T${time}:00`).toISOString();
  }

  private async runAppointmentAction(
    action: () => Promise<unknown>,
    successMessage: string,
    onSuccess?: () => void,
  ) {
    this.error.set('');
    this.successMessage.set('');

    try {
      await action();
      onSuccess?.();
      await this.refreshAgenda();
      this.successMessage.set(successMessage);
    } catch {
      this.error.set('No se pudo actualizar la cita.');
    }
  }
}
