import { Routes } from '@angular/router';

import { MainLayout } from './layout/main-layout/main-layout';
import { LoginPage } from './features/auth/login/login-page';
import { DashboardPage } from './features/dashboard/dashboard-page';
import { PatientsPage } from './features/patients/patient-list/patients-page';
import { PatientDetailPage } from './features/patients/patient-detail/patient-detail-page';
import { AppointmentsPage } from './features/appointments/appointments-page';
import { BodyMeasurementsPage } from './features/body-measurements/body-measurements-page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'dashboard', component: DashboardPage },
      { path: 'patients', component: PatientsPage },
      { path: 'patients/:id', component: PatientDetailPage },
      { path: 'appointments', component: AppointmentsPage },
      { path: 'body-measurements', component: BodyMeasurementsPage },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
