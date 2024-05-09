import { jsonToGraphQLQuery } from 'json-to-graphql-query';

const typeSchema = {
  kind: true,
  name: true,
  ofType: {
    kind: true,
    name: true,
    ofType: {
      kind: true,
      name: true,
      ofType: {
        kind: true,
        name: true,
      },
    },
  },
};

const inputValueSchema = {
  name: true,
  description: true,
  type: typeSchema,
  defaultValue: true,
};

export const introspectionQuery = jsonToGraphQLQuery({
  query: {
    __schema: {
      types: {
        kind: true,
        name: true,
        description: true,
        fields: {
          __args: {
            includeDeprecated: true,
          },
          name: true,
          description: true,
          args: inputValueSchema,
          type: typeSchema,
          isDeprecated: true,
          deprecationReason: true,
        },
        inputFields: inputValueSchema,
        interfaces: typeSchema,
        enumValues: {
          __args: {
            includeDeprecated: true,
          },
          name: true,
          description: true,
          isDeprecated: true,
          deprecationReason: true,
        },
        possibleTypes: typeSchema,
      },
    },
  },
});
