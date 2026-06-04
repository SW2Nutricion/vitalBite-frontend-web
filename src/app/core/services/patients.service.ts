import { Injectable } from '@angular/core';
import { GraphqlService } from '../graphql/graphql.service';
import { CreatePatientInput, Patient, PatientStatus } from '../models/vitalbite.models';

const PATIENT_FIELDS = `
  id
  tenantId
  nutritionistId
  firstName
  lastName
  fullName
  email
  phone
  birthDate
  gender
  status
  clinicalNotes
  nutritionGoal
  createdAt
  updatedAt
`;

@Injectable({ providedIn: 'root' })
export class PatientsService {
  constructor(private readonly graphql: GraphqlService) {}

  async list(filter?: { search?: string; status?: PatientStatus | null; nutritionistId?: string | null }) {
    const data = await this.graphql.query<{ patients: Patient[] }>(
      `
        query Patients($filter: PatientFilterInput) {
          patients(filter: $filter) {
            ${PATIENT_FIELDS}
          }
        }
      `,
      { filter: this.clean(filter ?? {}) },
    );
    return data.patients;
  }

  async byId(id: string) {
    const data = await this.graphql.query<{ patientById: Patient }>(
      `
        query PatientById($id: ID!) {
          patientById(id: $id) {
            ${PATIENT_FIELDS}
          }
        }
      `,
      { id },
    );
    return data.patientById;
  }

  async create(input: CreatePatientInput) {
    const data = await this.graphql.mutate<{ createPatient: Patient }>(
      `
        mutation CreatePatient($input: CreatePatientInput!) {
          createPatient(input: $input) {
            ${PATIENT_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );
    return data.createPatient;
  }

  async update(id: string, input: Partial<CreatePatientInput>) {
    const data = await this.graphql.mutate<{ updatePatient: Patient }>(
      `
        mutation UpdatePatient($id: ID!, $input: UpdatePatientInput!) {
          updatePatient(id: $id, input: $input) {
            ${PATIENT_FIELDS}
          }
        }
      `,
      { id, input: this.clean(input) },
    );
    return data.updatePatient;
  }

  async archive(id: string) {
    const data = await this.graphql.mutate<{ archivePatient: Patient }>(
      `
        mutation ArchivePatient($id: ID!) {
          archivePatient(id: $id) {
            ${PATIENT_FIELDS}
          }
        }
      `,
      { id },
    );
    return data.archivePatient;
  }

  private clean<T extends object>(value: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, field]) => field !== '' && field !== null && field !== undefined),
    );
  }
}
