import { Injectable } from '@angular/core';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
} from '../models/vitalbite.models';
import { GraphqlService } from '../graphql/graphql.service';

const APPOINTMENT_FIELDS = `
  id
  tenantId
  patientId
  nutritionistId
  scheduledAt
  durationMinutes
  status
  mode
  reason
  notes
  cancelReason
  patientFullName
  nutritionistFullName
  createdAt
  updatedAt
`;

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  constructor(private readonly graphql: GraphqlService) {}

  async calendar(filter?: {
    patientId?: string | null;
    nutritionistId?: string | null;
    status?: AppointmentStatus | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    search?: string | null;
  }) {
    const data = await this.graphql.query<{ appointmentsCalendar: Appointment[] }>(
      `
        query AppointmentsCalendar($filter: AppointmentFilterInput) {
          appointmentsCalendar(filter: $filter) {
            ${APPOINTMENT_FIELDS}
          }
        }
      `,
      { filter: this.clean(filter ?? {}) },
    );
    return data.appointmentsCalendar;
  }

  async byPatient(patientId: string) {
    const data = await this.graphql.query<{ appointmentsByPatient: Appointment[] }>(
      `
        query AppointmentsByPatient($patientId: ID!) {
          appointmentsByPatient(patientId: $patientId) {
            ${APPOINTMENT_FIELDS}
          }
        }
      `,
      { patientId },
    );
    return data.appointmentsByPatient;
  }

  async pending() {
    const data = await this.graphql.query<{ appointments: Appointment[] }>(
      `
        query GetPendingAppointments {
          appointments(filter: { status: PENDING }) {
            ${APPOINTMENT_FIELDS}
          }
        }
      `
    );
    return data.appointments;
  }


  async create(input: CreateAppointmentInput) {
    const data = await this.graphql.mutate<{ createAppointment: Appointment }>(
      `
        mutation CreateAppointment($input: CreateAppointmentInput!) {
          createAppointment(input: $input) {
            ${APPOINTMENT_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );
    return data.createAppointment;
  }

  async confirm(id: string) {
    return this.statusMutation('confirmAppointment', id);
  }

  async complete(id: string) {
    const data = await this.graphql.mutate<{ completeAppointment: Appointment }>(
      `
        mutation CompleteAppointment($id: ID!) {
          completeAppointment(id: $id) {
            ${APPOINTMENT_FIELDS}
          }
        }
      `,
      { id },
    );
    return data.completeAppointment;
  }

  async noShow(id: string) {
    return this.statusMutation('markAppointmentNoShow', id);
  }

  async cancel(id: string, reason = 'Cancelada desde agenda') {
    const data = await this.graphql.mutate<{ cancelAppointment: Appointment }>(
      `
        mutation CancelAppointment($id: ID!, $input: CancelAppointmentInput!) {
          cancelAppointment(id: $id, input: $input) {
            ${APPOINTMENT_FIELDS}
          }
        }
      `,
      { id, input: { reason } },
    );
    return data.cancelAppointment;
  }

  async reschedule(id: string, input: { scheduledAt: string; durationMinutes: number; reason?: string | null; notes?: string | null }) {
    const data = await this.graphql.mutate<{ rescheduleAppointment: Appointment }>(
      `
        mutation RescheduleAppointment($id: ID!, $input: RescheduleAppointmentInput!) {
          rescheduleAppointment(id: $id, input: $input) {
            ${APPOINTMENT_FIELDS}
          }
        }
      `,
      { id, input: this.clean(input) },
    );
    return data.rescheduleAppointment;
  }

  private async statusMutation(field: 'confirmAppointment' | 'markAppointmentNoShow', id: string) {
    const data = await this.graphql.mutate<Record<typeof field, Appointment>>(
      `
        mutation AppointmentStatus($id: ID!) {
          ${field}(id: $id) {
            ${APPOINTMENT_FIELDS}
          }
        }
      `,
      { id },
    );
    return data[field];
  }

  private clean<T extends object>(value: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, field]) => field !== '' && field !== null && field !== undefined),
    );
  }
}
