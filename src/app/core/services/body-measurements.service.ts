import { Injectable } from '@angular/core';
import {
  BodyComposition,
  BodyMeasurement,
  CreateBodyCompositionInput,
  CreateBodyMeasurementInput,
} from '../models/vitalbite.models';
import { GraphqlService } from '../graphql/graphql.service';

const MEASUREMENT_FIELDS = `
  id
  tenantId
  patientId
  registeredById
  measuredAt
  weightKg
  heightCm
  bmi
  waistCm
  hipCm
  createdAt
  updatedAt
`;

const COMPOSITION_FIELDS = `
  id
  tenantId
  patientId
  bodyMeasurementId
  measuredAt
  bodyFatPercentage
  muscleMassKg
  waterPercentage
  visceralFatLevel
  boneMassKg
  metabolicAge
  createdAt
  updatedAt
`;

@Injectable({ providedIn: 'root' })
export class BodyMeasurementsService {
  constructor(private readonly graphql: GraphqlService) {}

  async byPatient(patientId: string, filter?: { measuredFrom?: string | null; measuredTo?: string | null }) {
    const data = await this.graphql.query<{ bodyMeasurementsByPatient: BodyMeasurement[] }>(
      `
        query BodyMeasurementsByPatient($patientId: ID!, $filter: BodyMeasurementFilterInput) {
          bodyMeasurementsByPatient(patientId: $patientId, filter: $filter) {
            ${MEASUREMENT_FIELDS}
          }
        }
      `,
      { patientId, filter: this.clean(filter ?? {}) },
    );
    return data.bodyMeasurementsByPatient;
  }

  async createMeasurement(input: CreateBodyMeasurementInput) {
    const data = await this.graphql.mutate<{ createBodyMeasurement: BodyMeasurement }>(
      `
        mutation CreateBodyMeasurement($input: CreateBodyMeasurementInput!) {
          createBodyMeasurement(input: $input) {
            ${MEASUREMENT_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );
    return data.createBodyMeasurement;
  }

  async updateMeasurement(id: string, input: Partial<CreateBodyMeasurementInput>) {
    const data = await this.graphql.mutate<{ updateBodyMeasurement: BodyMeasurement }>(
      `
        mutation UpdateBodyMeasurement($id: ID!, $input: UpdateBodyMeasurementInput!) {
          updateBodyMeasurement(id: $id, input: $input) {
            ${MEASUREMENT_FIELDS}
          }
        }
      `,
      { id, input: this.clean(input) },
    );
    return data.updateBodyMeasurement;
  }

  async compositions(patientId: string) {
    const data = await this.graphql.query<{ bodyCompositionByPatient: BodyComposition[] }>(
      `
        query BodyCompositionByPatient($patientId: ID!) {
          bodyCompositionByPatient(patientId: $patientId) {
            ${COMPOSITION_FIELDS}
          }
        }
      `,
      { patientId },
    );
    return data.bodyCompositionByPatient;
  }

  async latestComposition(patientId: string) {
    const data = await this.graphql.query<{ latestBodyComposition: BodyComposition }>(
      `
        query LatestBodyComposition($patientId: ID!) {
          latestBodyComposition(patientId: $patientId) {
            ${COMPOSITION_FIELDS}
          }
        }
      `,
      { patientId },
    );
    return data.latestBodyComposition;
  }

  async createComposition(input: CreateBodyCompositionInput) {
    const data = await this.graphql.mutate<{ createBodyComposition: BodyComposition }>(
      `
        mutation CreateBodyComposition($input: CreateBodyCompositionInput!) {
          createBodyComposition(input: $input) {
            ${COMPOSITION_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );
    return data.createBodyComposition;
  }

  async updateComposition(id: string, input: Partial<CreateBodyCompositionInput>) {
    const data = await this.graphql.mutate<{ updateBodyComposition: BodyComposition }>(
      `
        mutation UpdateBodyComposition($id: ID!, $input: UpdateBodyCompositionInput!) {
          updateBodyComposition(id: $id, input: $input) {
            ${COMPOSITION_FIELDS}
          }
        }
      `,
      { id, input: this.clean(input) },
    );
    return data.updateBodyComposition;
  }

  private clean<T extends object>(value: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, field]) => field !== '' && field !== null && field !== undefined),
    );
  }
}
