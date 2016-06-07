import { isFunction, isString } from '../utils';
import { fromGlobalId } from 'graphql-relay';


/**
 * Extracts the fields of a GraphQL type
 */
export function getTypeFields(graphQLType) {
  const fields = graphQLType._typeConfig.fields;
  return isFunction(fields) ? fields() : fields;
}


/**
 * Assign fields to a GraphQL type
 */
export function setTypeFields(graphQLType, fields) {
  graphQLType._typeConfig.fields = () => fields; // eslint-disable-line no-param-reassign
}


/**
 * Add new fields or replace existed in a GraphQL type
 */
export function addTypeFields(graphQLType, newFields = {}) {
  const fields = getTypeFields(graphQLType);
  setTypeFields(graphQLType, Object.assign({}, fields, newFields));
}


/**
 * Remove field from a GraphQL type
 */
export function delTypeFields(graphQLType, fieldNameOrArray) {
  const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
  const fields = getTypeFields(graphQLType);
  fieldNames.forEach((fieldName) => delete fields[fieldName]);
  setTypeFields(graphQLType, Object.assign({}, fields));
}


/**
 * Get string with MongoId or GlobalId and returns MongoId string
 * @param _id
 * @returns string
 */
export function getClearId(_id) {
  if (isString(_id) && !/^[a-fA-F0-9]{24}$/.test(_id)) {
    const { type, id } = fromGlobalId(_id); // eslint-disable-line
    if (type && /^[a-zA-Z0-9]*$/.test(type)) {
      return id;
    }
  }

  return _id;
}
