import { Routes } from '@angular/router';

import { MainLayout } from './layout/main-layout/main-layout';
import { LandingPage } from './features/landing/landing-page';
import { LoginPage } from './features/auth/login/login-page';
import { RegisterPage } from './features/auth/register/register-page';
import { DashboardPage } from './features/dashboard/dashboard-page';
import { PatientsPage } from './features/patients/patient-list/patients-page';
import { PatientDetailPage } from './features/patients/patient-detail/patient-detail-page';
import { AppointmentsPage } from './features/appointments/appointments-page';
import { BodyMeasurementsPage } from './features/body-measurements/body-measurements-page';
import { PaymentsSubscriptionsPage } from './features/payments-subscriptions/payments-subscriptions-page';
import { authGuard, permissionGuard, publicOnlyGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LandingPage },
  { path: 'login', component: LoginPage, canActivate: [publicOnlyGuard] },
  { path: 'register', component: RegisterPage, canActivate: [publicOnlyGuard] },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard, roleGuard(['ADMINISTRADOR', 'ADMIN', 'NUTRICIONISTA'])],
    children: [
      {
        path: 'dashboard',
        component: DashboardPage,
        canActivate: [permissionGuard(['dashboard:read'])],
      },
      {
        path: 'patients',
        component: PatientsPage,
        canActivate: [permissionGuard(['patients:read'])],
      },
      {
        path: 'patients/:id',
        component: PatientDetailPage,
        canActivate: [permissionGuard(['patients:read'])],
      },
      {
        path: 'appointments',
        component: AppointmentsPage,
        canActivate: [permissionGuard(['appointments:read'])],
      },
      {
        path: 'body-measurements',
        component: BodyMeasurementsPage,
        canActivate: [permissionGuard(['body-measurements:read'])],
      },
      {
        path: 'payments-subscriptions',
        component: PaymentsSubscriptionsPage,
        canActivate: [permissionGuard(['payments:read'])],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
