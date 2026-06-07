import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideBadgeCheck,
  LucideBuilding2,
  LucideCreditCard,
  LucideHeartPulse,
  LucideRefreshCw,
  LucideShieldCheck,
  LucideUserRoundCheck,
} from '@lucide/angular';
import {
  CheckoutSessionStatus,
  SubscriptionPlan,
} from '../../core/models/vitalbite.models';
import { homeRouteFor } from '../../core/guards/role-routing';
import { PaymentsService } from '../../core/services/payments.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-activate-plan-page',
  imports: [
    LucideArrowRight,
    LucideBadgeCheck,
    LucideBuilding2,
    LucideCreditCard,
    LucideHeartPulse,
    LucideRefreshCw,
    LucideShieldCheck,
    LucideUserRoundCheck,
    RouterLink,
  ],
  templateUrl: './activate-plan-page.html',
  styleUrl: './activate-plan-page.scss',
})
export class ActivatePlanPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly statusMessage = signal('');
  readonly checkoutState = signal<'idle' | 'verifying' | 'canceled' | 'active'>(
    'idle',
  );
  readonly processingPlanCode = signal<string | null>(null);

  readonly clinicName = computed(
    () => this.session.tenant()?.name || 'tu centro de atencion',
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
      this.plans.set(plans);

      if (subscription) {
        this.checkoutState.set('active');
        await this.session.refreshSubscriptionState();
        await this.router.navigateByUrl(
          homeRouteFor(this.session.user()?.roleCode),
        );
        return;
      }

      const checkoutResult = this.route.snapshot.queryParamMap.get('checkout');
      const sessionId = this.route.snapshot.queryParamMap.get('session_id');

      if (checkoutResult === 'cancel') {
        this.checkoutState.set('canceled');
        this.statusMessage.set(
          'La compra fue cancelada. Puedes revisar los planes y reintentar cuando quieras.',
        );
      } else if (checkoutResult === 'success' && sessionId) {
        await this.verifyCheckoutSession(sessionId);
      }
    } catch {
      this.error.set(
        'No se pudo cargar la activacion comercial. Revisa la conexion con el servicio de pagos e intenta nuevamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async startCheckout(planCode: string) {
    this.processingPlanCode.set(planCode);
    this.error.set('');
    this.statusMessage.set('');

    try {
      const session =
        await this.paymentsService.createInitialCheckoutSession({ planCode });
      window.location.href = session.checkoutUrl;
    } catch {
      this.error.set(
        'No se pudo iniciar la compra del plan seleccionado. Intenta nuevamente.',
      );
      this.processingPlanCode.set(null);
    }
  }

  planIcon(plan: SubscriptionPlan) {
    return plan.code === 'clinic' ? 'clinic' : 'individual';
  }

  priceLabel(plan: SubscriptionPlan) {
    return `$${plan.priceUsd}/mes`;
  }

  async verifyCheckoutSession(sessionId: string) {
    this.checkoutState.set('verifying');
    this.statusMessage.set(
      'Estamos confirmando la activacion de tu cuenta profesional.',
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const status =
          await this.paymentsService.checkoutSessionStatus(sessionId);
        if (await this.handleCheckoutStatus(status)) {
          return;
        }
      } catch {
        this.error.set(
          'No se pudo validar el estado del pago. Puedes reintentar desde esta pantalla.',
        );
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    this.statusMessage.set(
      'El pago fue recibido, pero la activacion aun se esta sincronizando. Usa "Actualizar" para verificar nuevamente.',
    );
  }

  private async handleCheckoutStatus(status: CheckoutSessionStatus) {
    if (status.status === 'ACTIVE') {
      this.checkoutState.set('active');
      this.statusMessage.set(
        'Tu plan ya esta activo. Te llevaremos al panel principal.',
      );
      await this.session.refreshSubscriptionState();
      await this.router.navigateByUrl(homeRouteFor(this.session.user()?.roleCode));
      return true;
    }

    if (status.status === 'CANCELED' || status.status === 'EXPIRED') {
      this.checkoutState.set('canceled');
      this.statusMessage.set(
        'La sesion de pago ya no esta disponible. Puedes iniciar una nueva compra cuando quieras.',
      );
      return true;
    }

    return false;
  }
}
