import { Component, OnInit, computed, signal } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import {
  LucideBuilding2,
  LucideCheckCircle2,
  LucideEye,
  LucideRefreshCw,
  LucideX,
  LucideUsers,
  LucideUserCheck,
} from '@lucide/angular';
import {
  PlanChangeRequest,
  SuperAdminTenantDetail,
  SuperAdminTenantOverview,
  Tenant,
} from '../../core/models/vitalbite.models';
import { SuperAdminTenantsService } from '../../core/services/super-admin-tenants.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';

type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
type ResolveAction = 'APPROVE' | 'REJECT';

@Component({
  selector: 'app-super-admin-tenants-page',
  imports: [
    ModalComponent,
    NgxEchartsDirective,
    LucideBuilding2,
    LucideCheckCircle2,
    LucideEye,
    LucideRefreshCw,
    LucideX,
    LucideUsers,
    LucideUserCheck,
  ],
  templateUrl: './super-admin-tenants-page.html',
  styleUrl: './super-admin-tenants-page.scss',
})
export class SuperAdminTenantsPage implements OnInit {
  readonly tenants = signal<SuperAdminTenantOverview[]>([]);
  readonly selectedDetail = signal<SuperAdminTenantDetail | null>(null);
  readonly selectedRequest = signal<PlanChangeRequest | null>(null);
  readonly resolveAction = signal<ResolveAction>('APPROVE');
  readonly search = signal('');
  readonly status = signal('');
  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly detailError = signal('');
  readonly modalOpen = signal(false);
  readonly resolveModalOpen = signal(false);
  readonly resolveComment = signal('');

  readonly pendingCount = computed(() =>
    this.tenants().reduce((total, tenant) => total + tenant.pendingPlanChangeRequestsCount, 0),
  );

  readonly totalGlobalUsers = computed(() =>
    this.tenants().reduce((total, tenant) => total + tenant.usersCount, 0),
  );

  readonly totalGlobalPatients = computed(() =>
    this.tenants().reduce((total, tenant) => total + tenant.patientsCount, 0),
  );

  readonly totalActiveTenants = computed(() =>
    this.tenants().filter((t) => t.tenant.status === 'ACTIVE').length,
  );

  readonly statusChartOptions = computed<EChartsOption>(() => {
    const active = this.totalActiveTenants();
    const suspended = this.tenants().filter((t) => t.tenant.status === 'SUSPENDED').length;
    const disabled = this.tenants().filter((t) => t.tenant.status === 'DISABLED').length;

    return {
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom', textStyle: { color: '#64748b' } },
      series: [
        {
          name: 'Estados',
          type: 'pie',
          radius: ['45%', '75%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 16, fontWeight: 'bold' },
          },
          labelLine: { show: false },
          data: [
            { value: active, name: 'Activos', itemStyle: { color: '#10b981' } },
            { value: suspended, name: 'Suspendidos', itemStyle: { color: '#f59e0b' } },
            { value: disabled, name: 'Deshabilitados', itemStyle: { color: '#ef4444' } },
          ],
        },
      ],
    };
  });

  readonly volumeChartOptions = computed<EChartsOption>(() => {
    const sorted = [...this.tenants()]
      .sort((a, b) => b.patientsCount - a.patientsCount)
      .slice(0, 5);
    const names = sorted.map((t) => t.tenant.name);
    const patients = sorted.map((t) => t.patientsCount);
    const users = sorted.map((t) => t.usersCount);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { textStyle: { color: '#64748b' } },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } } },
      yAxis: { type: 'category', data: names, axisLabel: { color: '#64748b', width: 120, overflow: 'break' } },
      series: [
        {
          name: 'Pacientes',
          type: 'bar',
          data: patients,
          itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
        },
        {
          name: 'Usuarios',
          type: 'bar',
          data: users,
          itemStyle: { color: '#8b5cf6', borderRadius: [0, 4, 4, 0] },
        },
      ],
    };
  });

  constructor(private readonly superAdminTenantsService: SuperAdminTenantsService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');

    try {
      const tenants = await this.superAdminTenantsService.tenants({
        search: this.search(),
        status: this.status() || null,
      });
      this.tenants.set(tenants);
    } catch {
      this.error.set('No se pudo cargar la gestion global de tenants.');
    } finally {
      this.loading.set(false);
    }
  }

  async openDetail(tenantId: string) {
    this.modalOpen.set(true);
    this.detailLoading.set(true);
    this.detailError.set('');
    this.selectedDetail.set(null);

    try {
      this.selectedDetail.set(await this.superAdminTenantsService.tenantDetail(tenantId));
    } catch {
      this.detailError.set('No se pudo cargar el detalle del tenant.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  async updateStatus(tenant: Tenant, status: TenantStatus) {
    this.saving.set(true);
    this.detailError.set('');

    try {
      await this.superAdminTenantsService.updateTenantStatus({
        tenantId: tenant.id,
        status,
      });
      await this.load();
      if (this.modalOpen()) {
        await this.openDetail(tenant.id);
      }
    } catch {
      this.detailError.set('No se pudo actualizar el estado operativo del tenant.');
    } finally {
      this.saving.set(false);
    }
  }

  openResolveModal(request: PlanChangeRequest, action: ResolveAction) {
    this.selectedRequest.set(request);
    this.resolveAction.set(action);
    this.resolveComment.set('');
    this.resolveModalOpen.set(true);
  }

  async resolveRequest() {
    const detail = this.selectedDetail();
    const request = this.selectedRequest();
    if (!detail || !request) {
      return;
    }

    this.saving.set(true);
    this.detailError.set('');

    try {
      await this.superAdminTenantsService.resolvePlanChange({
        tenantId: detail.tenant.id,
        requestId: request.requestId,
        action: this.resolveAction(),
        comment: this.resolveComment(),
      });
      this.resolveModalOpen.set(false);
      await this.load();
      await this.openDetail(detail.tenant.id);
    } catch {
      this.detailError.set('No se pudo resolver la solicitud seleccionada.');
    } finally {
      this.saving.set(false);
    }
  }

  updateSearch(value: Event) {
    this.search.set((value.target as HTMLInputElement).value);
  }

  updateStatusFilter(value: Event) {
    this.status.set((value.target as HTMLSelectElement).value);
  }

  updateResolveComment(value: Event) {
    this.resolveComment.set((value.target as HTMLTextAreaElement).value);
  }

  statusLabel(status?: string) {
    return status === 'ACTIVE'
      ? 'Activo'
      : status === 'SUSPENDED'
        ? 'Suspendido'
        : status === 'DISABLED'
          ? 'Deshabilitado'
          : status || 'Sin estado';
  }

  requestStatusLabel(status?: string) {
    return status === 'PENDING'
      ? 'Pendiente'
      : status === 'APPROVED'
        ? 'Aprobada'
        : status === 'REJECTED'
          ? 'Rechazada'
          : status || 'Pendiente';
  }

  badgeClass(status?: string) {
    return status === 'ACTIVE' || status === 'APPROVED'
      ? ''
      : status === 'SUSPENDED' || status === 'PENDING'
        ? 'warning'
        : 'danger';
  }

  dateLabel(value?: string) {
    if (!value) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(new Date(value));
  }

  isPending(request: PlanChangeRequest) {
    return request.status === 'PENDING';
  }

  resolveTitle() {
    return this.resolveAction() === 'APPROVE' ? 'Aprobar solicitud' : 'Rechazar solicitud';
  }
}
