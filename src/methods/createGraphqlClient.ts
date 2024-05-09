import * as lodash from 'lodash';
import { Observable } from 'rxjs';
import { jsonToGraphQLQuery } from 'json-to-graphql-query';
import { SubscriptionClient } from 'graphql-subscriptions-client';
import { GraphQLClient } from 'graphql-request';
import { firstLetterLowerCase } from '@nmxjs/utils/dist/FirstLetterLowerCase';
import { sleep } from '@nmxjs/utils/dist/Sleep';
import { ICreateGraphqlClientOptions } from '../interfaces';
import { introspectionQuery, query, mutation, subscription } from '../constants';
import { findTypeName } from './findTypeName';

if (typeof window === 'undefined') {
  global.WebSocket = require('ws');
}

export function createGraphqlClient<T extends object>({
  ws,
  url,
  splitter = '0',
  wsGetConnectionParams = async () => ({}),
}: ICreateGraphqlClientOptions<T>): T {
  let isLoad = false;
  let error: Error;
  const apiService: any = {};
  const proxyApiService = new Proxy(apiService, {
    get: (_, key) =>
      isLoad
        ? apiService[key]
        : new Proxy(
            {},
            {
              get:
                (__, methodKey) =>
                async (...params) => {
                  while (!isLoad) {
                    await sleep({
                      time: 50,
                    });
                  }

                  if (error) {
                    throw error;
                  }

                  return apiService[key][methodKey](...params);
                },
            },
          ),
  });

  (async () => {
    const client = new GraphQLClient(url, {
      credentials: 'include',
    });
    let socketClient: SubscriptionClient;

    const {
      __schema: { types },
    }: any = await client.request(introspectionQuery).catch(e => {
      isLoad = true;
      error = e;
      throw e;
    });

    const rootTypes = types.filter(v => [query, mutation, subscription].includes(v.name));
    const wsStore: Record<string, Function[]> = {};
    const wsLocker: Record<string, string[]> = {};

    rootTypes.forEach(type => {
      type.fields.forEach(field => {
        const fields = {};

        const recursFields = (data, nesting: string[]) => {
          if (data.kind === 'OBJECT') {
            data.fields.forEach(f => {
              const typeName = findTypeName(f.type);
              recursFields(
                types.find(v => v.name === typeName),
                [...nesting, f.name],
              );
            });
            return;
          }

          if (!nesting.length) {
            return;
          }

          lodash.set(fields, nesting.join('.'), true);
        };

        const typeName = findTypeName(field.type);
        recursFields(
          types.find(v => v.name === typeName),
          [],
        );

        const queryType = firstLetterLowerCase({ str: type.name });
        const query = jsonToGraphQLQuery(
          !field.args[0]
            ? {
                [queryType]: {
                  [field.name]: fields,
                },
              }
            : {
                [`${queryType} ${field.name}($request: ${field.args[0].type.ofType.name}!)`]: {
                  [`${field.name}(request: $request)`]: fields,
                },
              },
        );

        lodash.set(
          apiService,
          field.name
            .split(splitter)
            .map(str => firstLetterLowerCase({ str }))
            .join('.'),
          type.name === subscription
            ? request =>
                ws
                  ? new Observable(subscriber => {
                      if (!wsLocker[query]) {
                        wsLocker[query] = [];
                      }

                      if (!wsStore[query]) {
                        wsStore[query] = [];
                      }

                      const index = wsLocker[query].push(query);

                      const callback = data => subscriber.next(data[field.name]);

                      wsStore[query].push(callback);

                      if (index !== 1) {
                        return () => {
                          wsStore[query].splice(
                            wsStore[query].findIndex(v => v === callback),
                            1,
                          );
                        };
                      }

                      const wsRequest = socketClient
                        .request({
                          query,
                          variables: { request },
                        })
                        .subscribe({
                          next: req => wsStore[query].forEach(c => c(req.data)),
                        });
                      return () => {
                        wsRequest.unsubscribe();
                        wsLocker[query] = [];
                        wsStore[query] = [];
                      };
                    })
                  : null
            : async (request = {}) =>
                client
                  .request(query, {
                    request,
                  })
                  .then(res => res[field.name]),
        );
      });
    });

    if (!ws) {
      isLoad = true;
      return apiService;
    }

    const connectionParams = await wsGetConnectionParams(apiService);

    await new Promise<void>((resolve, reject) => {
      socketClient = new SubscriptionClient(url.replace('https', 'wss').replace('http', 'ws'), {
        reconnect: false,
        lazy: false,
        connectionCallback: (error: any) => (error ? reject(error) : resolve()),
        connectionParams,
      });
    });

    isLoad = true;
  })();

  return proxyApiService;
}
