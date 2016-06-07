import { GraphQLInputObjectType } from 'graphql/type';
import * as Storage from '../storage';
import { getTypeFields } from '../utils';
import { removeWrongFields, convertFields } from './input-object';
import { getTypeFromModel } from '../index';


export function getFilterTypeFromModel(typeName, filterFields = {}, mongooseModel) {
  if (Storage.Types.has(typeName)) {
    return Storage.Types.get(typeName);
  }

  let fields = Object.assign({}, filterFields);

  if (Object.keys(fields).length === 0 && mongooseModel) {
    const typeFromModel = getTypeFromModel(mongooseModel);
    const allFields = getTypeFields(typeFromModel);
    fields = Object.assign({}, allFields);
  }

  const inputFields = convertFields(removeWrongFields(fields));

  // remove wrappers NonNull, List
  Object.keys(inputFields).forEach((fieldName) => {
    let fieldType = inputFields[fieldName].type;
    while (fieldType.ofType) {
      fieldType = fieldType.ofType;
    }
    inputFields[fieldName].type = fieldType;
  });

  const inputType = new GraphQLInputObjectType({
    name: typeName,
    fields: inputFields,
  });

  Storage.Types.set(typeName, inputType);

  return inputType;
}
