import { GraphQLList } from 'graphql';
import * as Resolver from '../resolver';
import { getPluralName, camelCase, isString, isObject } from '../utils';
import { getConnectionType } from '../type/graphql';


export function prepareSingularField(graphqlType, opts) {
  let name = camelCase(graphqlType.name);
  if (isString(opts)) {
    name = opts;
  } else if (isObject(opts) && isString(opts.name)) {
    name = opts.name;
  }

  const { args, resolve } = Resolver.getByIdResolver(graphqlType.name);

  const fieldConfig = {
    name,
    type: graphqlType,
    description: graphqlType.description,
    args,
    resolve,
  };

  return Object.assign({}, fieldConfig, opts);
}


export function preparePluralField(graphqlType, opts) {
  let name = getPluralName(graphqlType.name);
  if (isString(opts)) {
    name = opts;
  } else if (isObject(opts) && isString(opts.name)) {
    name = opts.name;
  }

  const { args, resolve } = Resolver.getByListResolver(graphqlType.name);

  const fieldConfig = {
    name,
    type: new GraphQLList(graphqlType),
    description: graphqlType.description,
    args,
    resolve,
  };

  return Object.assign({}, fieldConfig, opts);
}


export function prepareConnectionField(graphqlType, opts) {
  const connectionType = getConnectionType(graphqlType, opts);

  const { args, resolve } = Resolver.getByConnectionResolver(graphqlType.name);

  const fieldConfig = {
    name: camelCase(connectionType.name),
    type: connectionType,
    description: graphqlType.description,
    args,
    resolve,
  };

  return Object.assign({}, fieldConfig, opts);
}
