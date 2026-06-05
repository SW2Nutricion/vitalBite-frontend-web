import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuditEvent, AuditEventsFilterInput } from '../../core/models/vitalbite.models';
import { AuditLogService } from '../../core/services/audit-log.service';
import { SessionService } from '../../core/services/session.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-audit-log-page',
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './audit-log-page.html',
  styleUrl: './audit-log-page.scss',
})
export class AuditLogPage implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly events = signal<AuditEvent[]>([]);
  readonly selectedEvent = signal<AuditEvent | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    search: [''],
    tenantId: [''],
    action: [''],
    resourceType: [''],
    dateFrom: [''],
    dateTo: [''],
  });

  readonly isSuperAdmin = computed(
    () => this.session.user()?.roleCode?.trim().toUpperCase() === 'SUPER_ADMIN',
  );

  constructor(
    private readonly auditLogService: AuditLogService,
    readonly session: SessionService,
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');

    try {
      const value = this.form.getRawValue();
      const filter: AuditEventsFilterInput = {
        search: value.search,
        tenantId: this.isSuperAdmin() ? value.tenantId : null,
        action: value.action,
        resourceType: value.resourceType,
        dateFrom: this.toDateTime(value.dateFrom, false),
        dateTo: this.toDateTime(value.dateTo, true),
        limit: 100,
      };

      this.events.set(await this.auditLogService.events(filter));
    } catch {
      this.error.set('No se pudo cargar la bitacora de auditoria.');
    } finally {
      this.loading.set(false);
    }
  }

  async openDetail(event: AuditEvent) {
    try {
      this.selectedEvent.set(await this.auditLogService.eventById(event.id));
    } catch {
      this.selectedEvent.set(event);
    }
  }

  clearFilters() {
    this.form.reset({
      search: '',
      tenantId: '',
      action: '',
      resourceType: '',
      dateFrom: '',
      dateTo: '',
    });
    void this.load();
  }

  actionLabel(action: string) {
    return action
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  }

  roleLabel(roleCode?: string | null) {
    const role = roleCode?.trim().toUpperCase();
    if (role === 'SUPER_ADMIN') {
      return 'Super Admin';
    }

    return role === 'ADMINISTRADOR' || role === 'ADMIN'
      ? 'Administrador'
      : role === 'NUTRICIONISTA'
        ? 'Nutricionista'
        : roleCode || 'Sistema';
  }

  dateLabel(value?: string | null) {
    if (!value) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  shortHash(value?: string | null) {
    return value ? `${value.slice(0, 12)}...${value.slice(-8)}` : 'Genesis';
  }

  metadataLabel(value?: Record<string, unknown> | null) {
    return value ? JSON.stringify(value, null, 2) : '{}';
  }

  private toDateTime(value: string, endOfDay: boolean) {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);

    return date.toISOString();
  }
}
