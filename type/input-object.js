/* eslint-disable no-use-before-define */

import { nodeInterface } from './graphql';
import {
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLID,
} from 'graphql';
import * as Storage from '../storage';
import { setTypeFields, getTypeFields } from '../utils';


export function removeWrongFields(fields) {
  const result = {};
  Object.keys(fields).forEach((key) => {
    const field = fields[key];
    if (
      !field.readonly
      && !(field.type instanceof GraphQLInterfaceType)
    ) {
      result[key] = field;
    }
  });
  return result;
}


export function convertFields(fields) {
  const result = {};
  Object.keys(fields).forEach((key) => {
    result[key] = convertInputObjectField(fields[key]);
  });
  return result;
}


export function getInputObject(graphQLType) {
  const name = `${graphQLType.name}Input`;

  if (!Storage.Types.has(name)) {
    const InputType = new GraphQLInputObjectType({
      name,
      fields: {},
    });

    Storage.Types.set(name, InputType);

    const fields = removeWrongFields(getTypeFields(graphQLType));
    const inputFields = convertFields(fields);
    setTypeFields(InputType, inputFields);

    return InputType;
  }

  return Storage.Types.get(name);
}


export function convertInputObjectField(field) {
  let fieldType = field.type;
  const wrappers = [];

  while (fieldType.ofType) {
    wrappers.unshift(fieldType.constructor);
    fieldType = fieldType.ofType;
  }

  if (fieldType.name === 'GQLReference') {
    fieldType = GraphQLID;
  } else if (
    !(fieldType instanceof GraphQLInputObjectType ||
      fieldType instanceof GraphQLScalarType ||
      fieldType instanceof GraphQLEnumType
    )
  ) {
    fieldType = fieldType.getInterfaces().includes(nodeInterface)
      ? GraphQLID
      : getInputObject(fieldType);
  }

  fieldType = wrappers.reduce((type, Wrapper) => new Wrapper(type), fieldType);

  return { type: fieldType };
}
