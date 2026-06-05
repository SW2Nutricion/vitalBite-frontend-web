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

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: LandingPage },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'dashboard', component: DashboardPage },
      { path: 'patients', component: PatientsPage },
      { path: 'patients/:id', component: PatientDetailPage },
      { path: 'appointments', component: AppointmentsPage },
      { path: 'body-measurements', component: BodyMeasurementsPage },
    ],
  },
  { path: '**', redirectTo: '' },
];
