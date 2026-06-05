import { Injectable } from '@angular/core';
import {
  AnthropometryMeasurement,
  CreateAnthropometryMeasurementInput,
  UpdateAnthropometryMeasurementInput,
} from '../models/vitalbite.models';
import { GraphqlService } from '../graphql/graphql.service';

const ANTHROPOMETRY_FIELDS = `
  id
  tenantId
  patientId
  bodyMeasurementId
  measuredAt
  neckCm
  chestThoraxCm
  rightArmCm
  leftArmCm
  rightForearmCm
  leftForearmCm
  waistCm
  abdomenCm
  hipCm
  rightThighCm
  leftThighCm
  rightCalfCm
  leftCalfCm
  createdAt
  updatedAt
`;

@Injectable({ providedIn: 'root' })
export class AnthropometryService {
  constructor(private readonly graphql: GraphqlService) {}

  async byPatient(
    patientId: string,
    filter?: { measuredFrom?: string | null; measuredTo?: string | null },
  ) {
    const data = await this.graphql.query<{
      anthropometryByPatient: AnthropometryMeasurement[];
    }>(
      `
        query AnthropometryByPatient($patientId: ID!, $filter: AnthropometryMeasurementFilterInput) {
          anthropometryByPatient(patientId: $patientId, filter: $filter) {
            ${ANTHROPOMETRY_FIELDS}
          }
        }
      `,
      { patientId, filter: this.clean(filter ?? {}) },
    );

    return data.anthropometryByPatient;
  }

  async byId(id: string) {
    const data = await this.graphql.query<{
      anthropometryMeasurementById: AnthropometryMeasurement;
    }>(
      `
        query AnthropometryMeasurementById($id: ID!) {
          anthropometryMeasurementById(id: $id) {
            ${ANTHROPOMETRY_FIELDS}
          }
        }
      `,
      { id },
    );

    return data.anthropometryMeasurementById;
  }

  async create(input: CreateAnthropometryMeasurementInput) {
    const data = await this.graphql.mutate<{
      createAnthropometryMeasurement: AnthropometryMeasurement;
    }>(
      `
        mutation CreateAnthropometryMeasurement($input: CreateAnthropometryMeasurementInput!) {
          createAnthropometryMeasurement(input: $input) {
            ${ANTHROPOMETRY_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );

    return data.createAnthropometryMeasurement;
  }

  async update(id: string, input: UpdateAnthropometryMeasurementInput) {
    const data = await this.graphql.mutate<{
      updateAnthropometryMeasurement: AnthropometryMeasurement;
    }>(
      `
        mutation UpdateAnthropometryMeasurement($id: ID!, $input: UpdateAnthropometryMeasurementInput!) {
          updateAnthropometryMeasurement(id: $id, input: $input) {
            ${ANTHROPOMETRY_FIELDS}
          }
        }
      `,
      { id, input: this.clean(input) },
    );

    return data.updateAnthropometryMeasurement;
  }

  async delete(id: string) {
    const data = await this.graphql.mutate<{
      deleteAnthropometryMeasurement: AnthropometryMeasurement;
    }>(
      `
        mutation DeleteAnthropometryMeasurement($id: ID!) {
          deleteAnthropometryMeasurement(id: $id) {
            ${ANTHROPOMETRY_FIELDS}
          }
        }
      `,
      { id },
    );

    return data.deleteAnthropometryMeasurement;
  }

  private clean<T extends object>(value: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, field]) => field !== '' && field !== null && field !== undefined),
    );
  }
}
