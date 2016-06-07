/* eslint-disable arrow-body-style */

import * as Storage from '../../storage';
import { getNameViaOpts } from '../../utils';
import {
  GraphQLInt,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';


export function getPageInfoType() {
  const name = 'PageInfo';

  return Storage.getTypeWithCache(name, () => {
    return new GraphQLObjectType({
      name,
      description: 'Information about pagination in a connection.',
      fields: () => ({
        hasNextPage: {
          type: new GraphQLNonNull(GraphQLBoolean),
          description: 'When paginating forwards, are there more items?',
        },
        hasPreviousPage: {
          type: new GraphQLNonNull(GraphQLBoolean),
          description: 'When paginating backwards, are there more items?',
        },
        startCursor: {
          type: GraphQLString,
          description: 'When paginating backwards, the cursor to continue.',
        },
        endCursor: {
          type: GraphQLString,
          description: 'When paginating forwards, the cursor to continue.',
        },
      }),
    });
  });
}


export function getEdgeType(graphqlType, opts) {
  const name = getNameViaOpts(
    `${graphqlType.name}Edge`,
    opts
  );

  return Storage.getTypeWithCache(name, () => {
    return new GraphQLObjectType({
      name,
      description: 'An edge in a connection.',
      fields: () => ({
        node: {
          type: graphqlType,
          resolve: null,
          description: 'The item at the end of the edge',
        },
        cursor: {
          type: new GraphQLNonNull(GraphQLString),
          resolve: null,
          description: 'A cursor for use in pagination',
        },
      }),
    });
  });
}


export function getConnectionType(graphqlType, opts) {
  const name = getNameViaOpts(
    `${graphqlType.name}Connection`,
    opts
  );

  return Storage.getTypeWithCache(name, () => {
    return new GraphQLObjectType({
      name,
      description: 'A connection to a list of items.',
      fields: () => ({
        count: {
          type: GraphQLInt,
          description: 'Total object count.',
        },
        pageInfo: {
          type: new GraphQLNonNull(getPageInfoType()),
          description: 'Information to aid in pagination.',
        },
        edges: {
          type: new GraphQLList(getEdgeType(graphqlType, opts)),
          description: 'Information to aid in pagination.',
        },
      }),
    });
  });
}
