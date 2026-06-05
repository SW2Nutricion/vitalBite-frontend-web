import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_TOKEN_STORAGE_KEY, GraphqlService } from '../graphql/graphql.service';
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

const LOGIN = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        tenantId
        email
        firstName
        lastName
        roleCode
      }
      tenant {
        id
        name
        slug
        status
      }
    }
  }
`;

const REGISTER = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      user {
        id
        tenantId
        email
        firstName
        lastName
        roleCode
      }
      tenant {
        id
        name
        slug
        status
      }
    }
  }
`;

interface LoginResponse {
  login: {
    accessToken: string;
    user: User;
    tenant: Tenant;
  };
}

interface RegisterResponse {
  register: {
    accessToken: string;
    user: User;
    tenant: Tenant;
  };
}

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

  async login(email: string, password: string) {
    this.loading.set(true);
    try {
      const data = await this.graphql.mutate<LoginResponse>(LOGIN, {
        input: {
          email,
          password,
        },
      });

      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.login.accessToken);
      this.user.set(data.login.user);
      this.tenant.set(data.login.tenant);
      await this.router.navigateByUrl('/dashboard');
    } finally {
      this.loading.set(false);
    }
  }

  async register(input: { fullName: string; email: string; password: string; clinicName: string }) {
    this.loading.set(true);
    try {
      const data = await this.graphql.mutate<RegisterResponse>(REGISTER, {
        input,
      });

      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.register.accessToken);
      this.user.set(data.register.user);
      this.tenant.set(data.register.tenant);
      await this.router.navigateByUrl('/dashboard');
    } finally {
      this.loading.set(false);
    }
  }

  logout() {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    void this.graphql.clearStore();
    this.user.set(null);
    this.tenant.set(null);
    void this.router.navigateByUrl('/login');
  }
}
