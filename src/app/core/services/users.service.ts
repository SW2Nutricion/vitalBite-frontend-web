import { Injectable } from '@angular/core';
import { GraphqlService } from '../graphql/graphql.service';
import { CreateUserInput, UpdateUserInput, User } from '../models/vitalbite.models';

const USER_FIELDS = `
  id
  tenantId
  email
  firstName
  lastName
  roleCode
  status
  createdAt
  updatedAt
`;

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly graphql: GraphqlService) {}

  async users() {
    const data = await this.graphql.query<{ users: User[] }>(`
      query Users {
        users {
          ${USER_FIELDS}
        }
      }
    `);

    return data.users;
  }

  async createUser(input: CreateUserInput) {
    const data = await this.graphql.mutate<{ createUser: User }>(
      `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            ${USER_FIELDS}
          }
        }
      `,
      {
        input: this.normalizeUserInput(input),
      },
    );

    return data.createUser;
  }

  async updateUser(input: UpdateUserInput) {
    const data = await this.graphql.mutate<{ updateUser: User }>(
      `
        mutation UpdateUser($input: UpdateUserInput!) {
          updateUser(input: $input) {
            ${USER_FIELDS}
          }
        }
      `,
      {
        input: this.normalizeUserInput(input),
      },
    );

    return data.updateUser;
  }

  async disableUser(userId: string) {
    const data = await this.graphql.mutate<{ disableUser: User }>(
      `
        mutation DisableUser($userId: String!) {
          disableUser(userId: $userId) {
            ${USER_FIELDS}
          }
        }
      `,
      { userId },
    );

    return data.disableUser;
  }

  async reactivateUser(userId: string) {
    const data = await this.graphql.mutate<{ reactivateUser: User }>(
      `
        mutation ReactivateUser($userId: String!) {
          reactivateUser(userId: $userId) {
            ${USER_FIELDS}
          }
        }
      `,
      { userId },
    );

    return data.reactivateUser;
  }

  private normalizeUserInput<T extends CreateUserInput | UpdateUserInput>(input: T) {
    return {
      ...input,
      email: input.email.trim().toLowerCase(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      roleCode: input.roleCode.trim().toUpperCase(),
    };
  }
}
