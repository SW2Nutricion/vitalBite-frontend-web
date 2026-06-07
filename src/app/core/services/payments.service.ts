import { Injectable } from '@angular/core';
import { GraphqlService } from '../graphql/graphql.service';
import {
  CheckoutSessionStatus,
  InitialCheckoutSession,
  PaymentResponse,
  PlanChangeRequest,
  RequestPlanChangeInput,
  ResolvePlanChangeInput,
  SubscriptionPlan,
  TenantSubscription,
} from '../models/vitalbite.models';

const PLAN_FIELDS = `
  code
  name
  description
  priceUsd
  billingPeriod
  audience
  included
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
  limits {
    key
    value
  }
`;

const PLAN_CHANGE_REQUEST_FIELDS = `
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
export class PaymentsService {
  constructor(private readonly graphql: GraphqlService) {}

  async plans() {
    const data = await this.graphql.query<{ subscriptionPlans: SubscriptionPlan[] }>(`
      query SubscriptionPlans {
        subscriptionPlans {
          ${PLAN_FIELDS}
        }
      }
    `);

    return data.subscriptionPlans;
  }

  async currentSubscription() {
    const data = await this.graphql.query<{ currentTenantSubscription: TenantSubscription | null }>(`
      query CurrentTenantSubscription {
        currentTenantSubscription {
          ${SUBSCRIPTION_FIELDS}
        }
      }
    `);

    return data.currentTenantSubscription;
  }

  async createInitialCheckoutSession(input: { planCode: string }) {
    const data = await this.graphql.mutate<{
      createInitialCheckoutSession: InitialCheckoutSession;
    }>(
      `
        mutation CreateInitialCheckoutSession($input: CreateInitialCheckoutSessionInput!) {
          createInitialCheckoutSession(input: $input) {
            sessionId
            checkoutUrl
          }
        }
      `,
      { input: this.clean(input) },
    );

    return data.createInitialCheckoutSession;
  }

  async checkoutSessionStatus(sessionId: string) {
    const data = await this.graphql.query<{
      checkoutSessionStatus: CheckoutSessionStatus;
    }>(
      `
        query CheckoutSessionStatus($sessionId: String!) {
          checkoutSessionStatus(sessionId: $sessionId) {
            sessionId
            status
            planCode
            invoiceUrl
            activatedAt
            nextReviewAt
          }
        }
      `,
      { sessionId },
    );

    return data.checkoutSessionStatus;
  }

  async planChangeRequests() {
    const data = await this.graphql.query<{ planChangeRequests: PlanChangeRequest[] }>(`
      query PlanChangeRequests {
        planChangeRequests {
          ${PLAN_CHANGE_REQUEST_FIELDS}
        }
      }
    `);

    return data.planChangeRequests;
  }

  async requestPlanChange(input: RequestPlanChangeInput) {
    const data = await this.graphql.mutate<{ requestPlanChange: PlanChangeRequest }>(
      `
        mutation RequestPlanChange($input: RequestPlanChangeInput!) {
          requestPlanChange(input: $input) {
            ${PLAN_CHANGE_REQUEST_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );

    return data.requestPlanChange;
  }

  async approvePlanChange(input: ResolvePlanChangeInput) {
    const data = await this.graphql.mutate<{ approvePlanChange: PlanChangeRequest }>(
      `
        mutation ApprovePlanChange($input: ResolvePlanChangeInput!) {
          approvePlanChange(input: $input) {
            ${PLAN_CHANGE_REQUEST_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );

    return data.approvePlanChange;
  }

  async rejectPlanChange(input: ResolvePlanChangeInput) {
    const data = await this.graphql.mutate<{ rejectPlanChange: PlanChangeRequest }>(
      `
        mutation RejectPlanChange($input: ResolvePlanChangeInput!) {
          rejectPlanChange(input: $input) {
            ${PLAN_CHANGE_REQUEST_FIELDS}
          }
        }
      `,
      { input: this.clean(input) },
    );

    return data.rejectPlanChange;
  }

  private clean<T extends object>(value: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, field]) => field !== '' && field !== null && field !== undefined),
    );
  }

  async paySubscription(): Promise<PaymentResponse> {
    const data = await this.graphql.mutate<{ paySubscription: PaymentResponse }>(`
      mutation PaySubscription {
        paySubscription {
          transactionHash
          invoiceUrl
          nextReviewAt
        }
      }
    `);
    return data.paySubscription;
  }
}
