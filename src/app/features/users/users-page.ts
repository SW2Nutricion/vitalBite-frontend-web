import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideCheckCircle2,
  LucideRefreshCw,
  LucideShield,
  LucideUserPlus,
  LucideUsers,
} from '@lucide/angular';
import {
  CreateUserInput,
  SubscriptionPlan,
  TenantSubscription,
  UpdateUserInput,
  User,
} from '../../core/models/vitalbite.models';
import { PaymentsService } from '../../core/services/payments.service';
import { UsersService } from '../../core/services/users.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';

@Component({
  selector: 'app-users-page',
  imports: [
    ReactiveFormsModule,
    ModalComponent,
    LucideCheckCircle2,
    LucideRefreshCw,
    LucideShield,
    LucideUserPlus,
    LucideUsers,
  ],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
})
export class UsersPage implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly users = signal<User[]>([]);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly subscription = signal<TenantSubscription | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly actionError = signal('');
  readonly modalOpen = signal(false);
  readonly editingUser = signal<User | null>(null);
  readonly actingUserId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    roleCode: ['NUTRICIONISTA', Validators.required],
  });

  readonly activeUsersCount = computed(
    () => this.users().filter((user) => user.status === 'ACTIVE').length,
  );

  readonly isIndividualPlan = computed(() => this.subscription()?.planCode === 'individual');

  readonly userLimitReached = computed(
    () => this.isIndividualPlan() && this.activeUsersCount() >= 1,
  );

  readonly activePlan = computed(() =>
    this.plans().find((plan) => plan.code === this.subscription()?.planCode),
  );

  constructor(
    private readonly usersService: UsersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');

    try {
      const [users, plans, subscription] = await Promise.all([
        this.usersService.users(),
        this.paymentsService.plans(),
        this.paymentsService.currentSubscription(),
      ]);
      this.users.set(users);
      this.plans.set(plans);
      this.subscription.set(subscription);
    } catch {
      this.error.set('No se pudo cargar la gestion de usuarios.');
    } finally {
      this.loading.set(false);
    }
  }

  readonly modalTitle = computed(() =>
    this.editingUser() ? 'Editar usuario' : 'Nuevo usuario',
  );

  openCreateModal() {
    if (this.userLimitReached()) {
      this.formError.set(
        'El plan individual permite solo 1 usuario activo total. Solicita plan clinica para crear mas usuarios.',
      );
      return;
    }

    this.editingUser.set(null);
    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      roleCode: 'NUTRICIONISTA',
    });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  openEditModal(user: User) {
    this.editingUser.set(user);
    this.form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleCode: this.normalizeRole(user.roleCode) || 'NUTRICIONISTA',
    });
    this.formError.set('');
    this.modalOpen.set(true);
  }

  async submit() {
    if (this.form.invalid || this.isBlockedByLimit()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    try {
      const value = this.form.getRawValue();
      const editingUser = this.editingUser();

      if (editingUser) {
        await this.usersService.updateUser({
          userId: editingUser.id,
          ...value,
          roleCode: value.roleCode as UpdateUserInput['roleCode'],
        });
      } else {
        await this.usersService.createUser({
          ...value,
          roleCode: value.roleCode as CreateUserInput['roleCode'],
        });
      }

      this.modalOpen.set(false);
      this.editingUser.set(null);
      await this.load();
    } catch (error) {
      this.formError.set(this.errorMessage(error, 'No se pudo guardar el usuario.'));
    } finally {
      this.saving.set(false);
    }
  }

  isBlockedByLimit() {
    return !this.editingUser() && this.userLimitReached();
  }

  async disableUser(user: User) {
    if (!window.confirm(`Desactivar a ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    this.actingUserId.set(user.id);
    this.actionError.set('');

    try {
      await this.usersService.disableUser(user.id);
      await this.load();
    } catch (error) {
      this.actionError.set(
        this.errorMessage(error, 'No se pudo desactivar el usuario. Verifica que no sea el ultimo administrador activo.'),
      );
    } finally {
      this.actingUserId.set(null);
    }
  }

  async reactivateUser(user: User) {
    if (!window.confirm(`Reactivar a ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    this.actingUserId.set(user.id);
    this.actionError.set('');

    try {
      await this.usersService.reactivateUser(user.id);
      await this.load();
    } catch (error) {
      this.actionError.set(
        this.errorMessage(error, 'No se pudo reactivar el usuario. El plan individual no permite reactivacion manual.'),
      );
    } finally {
      this.actingUserId.set(null);
    }
  }

  roleLabel(roleCode?: string) {
    const role = this.normalizeRole(roleCode);
    return role === 'ADMINISTRADOR' || role === 'ADMIN'
      ? 'Administrador'
      : role === 'NUTRICIONISTA'
        ? 'Nutricionista'
        : roleCode || 'Usuario';
  }

  statusLabel(status?: string) {
    return status === 'ACTIVE'
      ? 'Activo'
      : status === 'DISABLED'
        ? 'Deshabilitado'
        : status || 'Sin estado';
  }

  isActive(user: User) {
    return user.status === 'ACTIVE';
  }

  isDisabled(user: User) {
    return user.status === 'DISABLED';
  }

  dateLabel(value?: string) {
    if (!value) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(new Date(value));
  }

  planPriceLabel() {
    const plan = this.activePlan();
    return plan ? `$${plan.priceUsd}/mes` : 'Sin precio';
  }

  private normalizeRole(roleCode?: string) {
    return roleCode?.trim().toUpperCase();
  }

  private errorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
