import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GraphqlService } from '../graphql/graphql.service';
import { Tenant, User } from '../models/vitalbite.models';

const CURRENT_CONTEXT = `
  query CurrentContext {
    me {
      id
      tenantId
      email
      firstName
      lastName
      roleCode
    }
    currentTenant {
      id
      name
      slug
      status
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly user = signal<User | null>(null);
  readonly tenant = signal<Tenant | null>(null);
  readonly loading = signal(false);

  constructor(
    private readonly graphql: GraphqlService,
    private readonly router: Router,
  ) {}

  async loadContext() {
    const data = await this.graphql.query<{ me: User; currentTenant: Tenant }>(CURRENT_CONTEXT);
    this.user.set(data.me);
    this.tenant.set(data.currentTenant);
    return data;
  }

  async demoLogin() {
    this.loading.set(true);
    try {
      await this.loadContext();
      await this.router.navigateByUrl('/dashboard');
    } finally {
      this.loading.set(false);
    }
  }

  logout() {
    this.user.set(null);
    this.tenant.set(null);
    void this.router.navigateByUrl('/login');
  }
}
