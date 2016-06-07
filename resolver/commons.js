import { getSortTypeFromModel } from '../type/sort-type';
import { getFilterTypeFromModel } from '../type/filter-type';
import { upperFirst } from '../utils';
import { projection } from '../resolver';
import * as Storage from '../storage';


export function getArgsFromOpts(typeName, resolverOpts = {}) {
  const { sort, filter, args } = resolverOpts;

  const result = args ? Object.assign({}, args) : {};

  const mongooseModel = Storage.MongooseModels.get(typeName);
  if (mongooseModel) {
    const sortType = getSortTypeFromModel(
      `Sort${upperFirst(mongooseModel.modelName)}`,
      sort || [],
      mongooseModel
    );
    const filterType = getFilterTypeFromModel(
      `Filter${upperFirst(mongooseModel.modelName)}`,
      filter || {},
      mongooseModel
    );

    if (filterType) {
      result.filter = {
        name: 'filter',
        type: filterType,
      };
    }

    if (sortType) {
      result.sort = {
        name: 'sort',
        type: sortType,
      };
    }
  }

  return result;
}


export function getRenamedMongooseFields(mongooseModel) {
  const renamedMapNames = {};

  if (mongooseModel && mongooseModel.schema && mongooseModel.schema.paths) {
    Object.keys(mongooseModel.schema.paths).forEach((name) => {
      const opts = mongooseModel.schema.paths[name].options || {};
      if (opts.graphQL && opts.graphQL.name) {
        renamedMapNames[opts.graphQL.name] = name;
      }
    });
  }

  if (Object.keys(renamedMapNames).length === 0) {
    return null;
  }

  return renamedMapNames;
}
