import { Injectable } from '@angular/core';
import { GraphqlService } from '../graphql/graphql.service';
import {
  CreateDietPlanInput,
  DietPlan,
  DietPlanDayInput,
  DietPlanStatus,
  UpdateDietPlanInput,
} from '../models/vitalbite.models';

const DIET_FIELDS = `
  id
  tenantId
  patientId
  nutritionistId
  name
  objective
  phase
  approach
  startDate
  endDate
  status
  mealsPerDay
  mainRestriction
  notes
  estimatedCalories
  adherencePercent
  patientFullName
  nutritionistFullName
  createdAt
  updatedAt
  days {
    id
    dietPlanId
    dayLabel
    dayOrder
    createdAt
    updatedAt
    meals {
      id
      dietPlanDayId
      name
      mealOrder
      targetCalories
      notes
      createdAt
      updatedAt
      items {
        id
        dietMealId
        name
        portion
        calories
        itemOrder
        notes
        createdAt
        updatedAt
      }
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class DietsService {
  constructor(private readonly graphql: GraphqlService) {}

  async list(filter?: {
    patientId?: string | null;
    nutritionistId?: string | null;
    status?: DietPlanStatus | null;
    search?: string | null;
  }) {
    const data = await this.graphql.query<{ diets: DietPlan[] }>(
      `
        query Diets($filter: DietFilterInput) {
          diets(filter: $filter) {
            ${DIET_FIELDS}
          }
        }
      `,
      { filter: this.clean(filter ?? {}) },
    );
    return data.diets;
  }

  async byPatient(patientId: string) {
    const data = await this.graphql.query<{ dietsByPatient: DietPlan[] }>(
      `
        query DietsByPatient($patientId: ID!) {
          dietsByPatient(patientId: $patientId) {
            ${DIET_FIELDS}
          }
        }
      `,
      { patientId },
    );
    return data.dietsByPatient;
  }

  async byId(id: string) {
    const data = await this.graphql.query<{ dietById: DietPlan }>(
      `
        query DietById($id: ID!) {
          dietById(id: $id) {
            ${DIET_FIELDS}
          }
        }
      `,
      { id },
    );
    return data.dietById;
  }

  async create(input: CreateDietPlanInput) {
    const data = await this.graphql.mutate<{ createDietPlan: DietPlan }>(
      `
        mutation CreateDietPlan($input: CreateDietPlanInput!) {
          createDietPlan(input: $input) {
            ${DIET_FIELDS}
          }
        }
      `,
      { input: this.cleanDeep(input) },
    );
    return data.createDietPlan;
  }

  async update(id: string, input: UpdateDietPlanInput) {
    const data = await this.graphql.mutate<{ updateDietPlan: DietPlan }>(
      `
        mutation UpdateDietPlan($id: ID!, $input: UpdateDietPlanInput!) {
          updateDietPlan(id: $id, input: $input) {
            ${DIET_FIELDS}
          }
        }
      `,
      { id, input: this.cleanDeep(input) },
    );
    return data.updateDietPlan;
  }

  async updateStructure(id: string, days: DietPlanDayInput[]) {
    const data = await this.graphql.mutate<{ updateDietPlanStructure: DietPlan }>(
      `
        mutation UpdateDietPlanStructure($id: ID!, $input: UpdateDietPlanStructureInput!) {
          updateDietPlanStructure(id: $id, input: $input) {
            ${DIET_FIELDS}
          }
        }
      `,
      { id, input: { days: this.cleanDeep(days) } },
    );
    return data.updateDietPlanStructure;
  }

  async changeStatus(id: string, status: DietPlanStatus) {
    const data = await this.graphql.mutate<{ changeDietPlanStatus: DietPlan }>(
      `
        mutation ChangeDietPlanStatus($id: ID!, $status: DietPlanStatus!) {
          changeDietPlanStatus(id: $id, status: $status) {
            ${DIET_FIELDS}
          }
        }
      `,
      { id, status },
    );
    return data.changeDietPlanStatus;
  }

  async duplicateDay(input: {
    dietPlanId: string;
    sourceDayId: string;
    targetDayLabel?: string | null;
    targetDayOrder?: number | null;
  }) {
    const data = await this.graphql.mutate<{ duplicateDietPlanDay: DietPlan }>(
      `
        mutation DuplicateDietPlanDay($input: DuplicateDietPlanDayInput!) {
          duplicateDietPlanDay(input: $input) {
            ${DIET_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );
    return data.duplicateDietPlanDay;
  }

  private clean<T extends object>(value: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, field]) => field !== '' && field !== null && field !== undefined),
    );
  }

  private cleanDeep<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((item) => this.cleanDeep(item)) as T;
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, field]) => field !== '' && field !== null && field !== undefined)
          .map(([key, field]) => [key, this.cleanDeep(field)]),
      ) as T;
    }

    return value;
  }
}
