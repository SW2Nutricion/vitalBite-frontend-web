import { Injectable } from '@angular/core';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core';
import { HttpLink } from '@apollo/client/link/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private readonly client: ApolloClient;

  constructor() {
    this.client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: environment.graphqlUrl,
        fetch,
      }),
      defaultOptions: {
        watchQuery: { fetchPolicy: 'network-only' },
        query: { fetchPolicy: 'network-only' },
      },
    });
  }

  async query<TData>(query: string, variables?: Record<string, unknown>): Promise<TData> {
    const result = await this.client.query({
      query: gql(query),
      variables,
    });

    return result.data as TData;
  }

  async mutate<TData>(mutation: string, variables?: Record<string, unknown>): Promise<TData> {
    const result = await this.client.mutate({
      mutation: gql(mutation),
      variables,
    });

    if (!result.data) {
      throw new Error('No se recibio respuesta del servidor.');
    }

    void this.client.clearStore();
    return result.data as TData;
  }
}
