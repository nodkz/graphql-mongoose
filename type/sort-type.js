import { GraphQLEnumType } from 'graphql/type';
import * as Storage from '../storage';
import { getIndexesFromModel } from '../utils';


export function getSortFields(mongooseModel) {
  const indexes = getIndexesFromModel(mongooseModel, true);

  const result = [];
  indexes.forEach((indexObj) => {
    const partialIndexObj = {};
    Object.keys(indexObj).forEach((fieldName) => {
      partialIndexObj[fieldName] = indexObj[fieldName];

      // normal sorting
      result.push(Object.assign({}, partialIndexObj));

      // reversed sorting
      // https://docs.mongodb.org/manual/tutorial/sort-results-with-indexes/#sort-on-multiple-fields
      const partialReversed = Object.assign({}, partialIndexObj);
      Object.keys(partialReversed).forEach((f) => {
        if (partialReversed[f] === 1) partialReversed[f] = -1;
        else if (partialReversed[f] === -1) partialReversed[f] = 1;
      });

      result.push(partialReversed);
    });
  });

  return result;
}


/**
 * each sortField must be object, eg sortFields = [ {_id: 1}, {_id: -1}, { name: 1, _id: -1} ]
 */
export function getSortTypeFromModel(typeName, sortFields = [], mongooseModel) {
  if (Storage.Types.has(typeName)) {
    return Storage.Types.get(typeName);
  }

  let fields = sortFields.slice(); // copy array
  if (fields.length === 0 && mongooseModel) {
    fields = getSortFields(mongooseModel);
  }

  if (fields.length === 0) {
    return null;
  }

  const sortEnumValues = {};
  fields.forEach((sortData) => {
    const keys = Object.keys(sortData);
    let name = keys.join('__').toUpperCase().replace('.', '__');
    if (sortData[keys[0]] === 1) {
      name = `${name}_ASC`;
    } else if (sortData[keys[0]] === -1) {
      name = `${name}_DESC`;
    }
    sortEnumValues[name] = {
      name,
      value: sortData,
    };
  });

  const sortType = new GraphQLEnumType({
    name: typeName,
    values: sortEnumValues,
  });

  Storage.Types.set(typeName, sortType);

  return sortType;
}
