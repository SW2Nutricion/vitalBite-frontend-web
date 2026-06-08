import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideBadgeDollarSign,
  LucideBuilding2,
  LucideCheckCircle2,
  LucideCreditCard,
  LucideRefreshCw,
  LucideUserRoundCheck,
} from '@lucide/angular';
import {
  PlanLimit,
  PlanChangeRequest,
  PaymentResponse,
  PaymentHistoryItem,
  SubscriptionPlan,
  TenantSubscription,
} from '../../core/models/vitalbite.models';
import { PaymentsService } from '../../core/services/payments.service';
import { SessionService } from '../../core/services/session.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-payments-subscriptions-page',
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    LucideBadgeDollarSign,
    LucideBuilding2,
    LucideCheckCircle2,
    LucideCreditCard,
    LucideRefreshCw,
    LucideUserRoundCheck,
  ],
  templateUrl: './payments-subscriptions-page.html',
  styleUrl: './payments-subscriptions-page.scss',
})
export class PaymentsSubscriptionsPage implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly subscription = signal<TenantSubscription | null>(null);
  readonly requests = signal<PlanChangeRequest[]>([]);
  readonly history = signal<PaymentHistoryItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly resolving = signal(false);
  readonly formError = signal('');
  readonly resolveModalOpen = signal(false);
  readonly selectedRequest = signal<PlanChangeRequest | null>(null);
  readonly resolveAction = signal<'approve' | 'reject'>('approve');
  readonly resolveError = signal('');
  readonly payModalOpen = signal(false);
  readonly paying = signal(false);
  readonly payError = signal('');
  readonly lastPaymentResult = signal<PaymentResponse | null>(null);

  readonly form = this.fb.nonNullable.group({
    planCode: ['', Validators.required],
    comment: [''],
  });

  readonly resolveForm = this.fb.nonNullable.group({
    comment: [''],
  });

  readonly currentPlan = computed(() =>
    this.plans().find((plan) => plan.code === this.subscription()?.planCode),
  );

  readonly targetPlan = computed(() =>
    this.plans().find((plan) => plan.code === this.form.controls.planCode.value),
  );

  constructor(
    private readonly paymentsService: PaymentsService,
    readonly session: SessionService,
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');

    try {
      const [plans, subscription] = await Promise.all([
        this.paymentsService.plans(),
        this.paymentsService.currentSubscription(),
      ]);
      const [requests, history] = await Promise.all([
        this.paymentsService.planChangeRequests(),
        this.paymentsService.paymentHistory(),
      ]);
      this.plans.set(plans);
      this.subscription.set(subscription);
      this.requests.set(requests);
      this.history.set(history);
    } catch {
      this.error.set('No se pudo cargar la informacion de planes y suscripcion.');
    } finally {
      this.loading.set(false);
    }
  }

  openRequestModal() {
    const nextPlan = this.plans().find((plan) => plan.code !== this.subscription()?.planCode);
    this.form.reset({
      planCode: nextPlan?.code ?? '',
      comment: '',
    });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  async submitPlanChange() {
    if (this.form.invalid || this.isCurrentPlanSelected()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    try {
      const raw = this.form.getRawValue();
      await this.paymentsService.requestPlanChange({
        planCode: raw.planCode,
        comment: raw.comment,
      });
      this.modalOpen.set(false);
      await this.load();
    } catch {
      this.formError.set('No se pudo enviar la solicitud. Revisa el plan seleccionado.');
    } finally {
      this.saving.set(false);
    }
  }

  openResolveModal(request: PlanChangeRequest, action: 'approve' | 'reject') {
    this.selectedRequest.set(request);
    this.resolveAction.set(action);
    this.resolveForm.reset({ comment: '' });
    this.resolveError.set('');
    this.resolveModalOpen.set(true);
  }

  async submitResolution() {
    const request = this.selectedRequest();
    if (!request) {
      return;
    }

    this.resolving.set(true);
    this.resolveError.set('');

    try {
      const input = {
        requestId: request.requestId,
        comment: this.resolveForm.getRawValue().comment,
      };
      if (this.resolveAction() === 'approve') {
        await this.paymentsService.approvePlanChange(input);
      } else {
        await this.paymentsService.rejectPlanChange(input);
      }
      this.resolveModalOpen.set(false);
      await this.load();
    } catch {
      this.resolveError.set('No se pudo resolver la solicitud seleccionada.');
    } finally {
      this.resolving.set(false);
    }
  }

  priceLabel(plan: SubscriptionPlan) {
    return `$${plan.priceUsd}/mes`;
  }

  statusLabel(status?: string) {
    return status === 'ACTIVE' ? 'Activo' : 'Revision requerida';
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

  requestBadgeClass(status?: string) {
    return status === 'APPROVED' ? '' : status === 'REJECTED' ? 'danger' : 'warning';
  }

  statusInlineLabel(status?: string) {
    return status === 'ACTIVE' ? 'activa' : 'en revision';
  }

  dateLabel(value?: string) {
    if (!value) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(new Date(value));
  }

  limitLabel(limit: PlanLimit) {
    return limit.key === 'nutritionists'
      ? 'Profesionales'
      : limit.key === 'workspace'
        ? 'Espacio de trabajo'
        : limit.key;
  }

  planIcon(plan: SubscriptionPlan) {
    return plan.code === 'clinic' ? 'clinic' : 'individual';
  }

  isCurrentPlanSelected() {
    return this.form.controls.planCode.value === this.subscription()?.planCode;
  }

  isPending(request: PlanChangeRequest) {
    return request.status === 'PENDING';
  }

  resolveTitle() {
    return this.resolveAction() === 'approve' ? 'Aprobar cambio de plan' : 'Rechazar solicitud';
  }

  resolveButtonLabel() {
    if (this.resolving()) {
      return 'Guardando...';
    }

    return this.resolveAction() === 'approve' ? 'Aprobar solicitud' : 'Rechazar solicitud';
  }

  openPayModal() {
    this.payError.set('');
    this.payModalOpen.set(true);
  }

  async confirmPayment() {
    this.paying.set(true);
    this.payError.set('');

    try {
      const result = await this.paymentsService.paySubscription();
      this.lastPaymentResult.set(result);
      this.payModalOpen.set(false);
      await this.load();
    } catch {
      this.payError.set('No se pudo procesar el pago. Intenta nuevamente.');
    } finally {
      this.paying.set(false);
    }
  }

  paymentStateLabel(item: PaymentHistoryItem) {
    if (item.invoiceStatus === 'READY') {
      return 'Factura disponible';
    }
    if (item.invoiceStatus === 'FAILED') {
      return 'Factura pendiente';
    }
    return 'En proceso';
  }

  paymentBadgeClass(item: PaymentHistoryItem) {
    return item.invoiceStatus === 'READY'
      ? 'success'
      : item.invoiceStatus === 'FAILED'
        ? 'danger'
        : 'warning';
  }

  paymentDate(item: PaymentHistoryItem) {
    return this.dateLabel(item.createdAt);
  }

  async retryInvoice(item: PaymentHistoryItem) {
    this.payError.set('');

    try {
      const updated = await this.paymentsService.retryInvoiceGeneration(item.recordId);
      this.lastPaymentResult.set({
        transactionHash: updated.transactionHash ?? item.transactionHash ?? '',
        invoiceUrl: updated.invoiceUrl ?? null,
        invoiceStatus: updated.invoiceStatus,
        invoiceError: updated.invoiceError ?? null,
        nextReviewAt: updated.nextReviewAt || item.nextReviewAt || new Date().toISOString(),
      });
      await this.load();
    } catch {
      this.payError.set('No se pudo regenerar la factura. Intenta nuevamente.');
    }
  }
}
