import { Injectable } from '@angular/core';
import { GraphqlService } from '../graphql/graphql.service';
import {
  PlanChangeRequest,
  ResolveSuperAdminPlanChangeInput,
  SuperAdminTenantDetail,
  SuperAdminTenantOverview,
  Tenant,
  UpdateTenantStatusInput,
} from '../models/vitalbite.models';

const TENANT_FIELDS = `
  id
  name
  slug
  status
  createdAt
  updatedAt
`;

const LIMIT_FIELDS = `
  limits {
    key
    value
  }
`;

const SUBSCRIPTION_FIELDS = `
  tenantId
  planCode
  planName
  status
  billingPeriod
  startedAt
  nextReviewAt
  ${LIMIT_FIELDS}
`;

const REQUEST_FIELDS = `
  requestId
  tenantId
  currentPlanCode
  requestedPlanCode
  requestedPlanName
  status
  comment
  requestedAt
  resolutionComment
  resolvedAt
`;

@Injectable({ providedIn: 'root' })
export class SuperAdminTenantsService {
  constructor(private readonly graphql: GraphqlService) {}

  async tenants(filters: { search?: string; status?: string | null }) {
    const data = await this.graphql.query<{
      superAdminTenants: SuperAdminTenantOverview[];
    }>(
      `
        query SuperAdminTenants($search: String, $status: TenantStatus) {
          superAdminTenants(search: $search, status: $status) {
            tenant {
              ${TENANT_FIELDS}
            }
            subscription {
              ${SUBSCRIPTION_FIELDS}
            }
            pendingPlanChangeRequestsCount
            usersCount
            patientsCount
          }
        }
      `,
      this.clean(filters),
    );

    return data.superAdminTenants;
  }

  async tenantDetail(tenantId: string) {
    const data = await this.graphql.query<{
      superAdminTenantDetail: SuperAdminTenantDetail;
    }>(
      `
        query SuperAdminTenantDetail($tenantId: String!) {
          superAdminTenantDetail(tenantId: $tenantId) {
            tenant {
              ${TENANT_FIELDS}
            }
            subscription {
              ${SUBSCRIPTION_FIELDS}
            }
            planChangeRequests {
              ${REQUEST_FIELDS}
            }
            usersCount
            patientsCount
          }
        }
      `,
      { tenantId },
    );

    return data.superAdminTenantDetail;
  }

  async planChangeRequests(filters: { status?: string; tenantId?: string }) {
    const data = await this.graphql.query<{
      superAdminPlanChangeRequests: PlanChangeRequest[];
    }>(
      `
        query SuperAdminPlanChangeRequests($status: String, $tenantId: String) {
          superAdminPlanChangeRequests(status: $status, tenantId: $tenantId) {
            ${REQUEST_FIELDS}
          }
        }
      `,
      this.clean(filters),
    );

    return data.superAdminPlanChangeRequests;
  }

  async updateTenantStatus(input: UpdateTenantStatusInput) {
    const data = await this.graphql.mutate<{ updateTenantStatus: Tenant }>(
      `
        mutation UpdateTenantStatus($input: UpdateTenantStatusInput!) {
          updateTenantStatus(input: $input) {
            ${TENANT_FIELDS}
          }
        }
      `,
      { input },
    );

    return data.updateTenantStatus;
  }

  async resolvePlanChange(input: ResolveSuperAdminPlanChangeInput) {
    const data = await this.graphql.mutate<{
      resolveSuperAdminPlanChange: PlanChangeRequest;
    }>(
      `
        mutation ResolveSuperAdminPlanChange($input: ResolveSuperAdminPlanChangeInput!) {
          resolveSuperAdminPlanChange(input: $input) {
            ${REQUEST_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );

    return data.resolveSuperAdminPlanChange;
  }

  private clean<T extends object>(value: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, field]) => field !== '' && field !== null && field !== undefined,
      ),
    );
  }
}
