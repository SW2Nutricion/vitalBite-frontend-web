import { Injectable } from '@angular/core';
import { GraphqlService } from '../graphql/graphql.service';
import { AuditEvent, AuditEventsFilterInput } from '../models/vitalbite.models';

const AUDIT_EVENT_FIELDS = `
  id
  tenantId
  tenantName
  tenantSlug
  actorUserId
  actorTenantId
  actorEmail
  actorRoleCode
  action
  resourceType
  resourceId
  summary
  metadata
  previousHash
  eventHash
  createdAt
`;

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  constructor(private readonly graphql: GraphqlService) {}

  async events(filter: AuditEventsFilterInput) {
    const data = await this.graphql.query<{ auditEvents: AuditEvent[] }>(
      `
        query AuditEvents($filter: AuditEventsFilterInput) {
          auditEvents(filter: $filter) {
            ${AUDIT_EVENT_FIELDS}
          }
        }
      `,
      {
        filter: this.clean(filter),
      },
    );

    return data.auditEvents;
  }

  async eventById(id: string) {
    const data = await this.graphql.query<{ auditEventById: AuditEvent }>(
      `
        query AuditEventById($id: String!) {
          auditEventById(id: $id) {
            ${AUDIT_EVENT_FIELDS}
          }
        }
      `,
      { id },
    );

    return data.auditEventById;
  }

  private clean<T extends object>(value: T): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, field]) => field !== '' && field !== null && field !== undefined,
      ),
    );
  }
}
