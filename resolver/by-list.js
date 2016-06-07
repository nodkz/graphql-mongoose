import { getClearId, dotObject } from '../utils';
import * as mongoose from '../mongoose';
import { projection, projectionFixRenamed } from './projection';
import {
  GraphQLID,
  GraphQLInt,
  GraphQLList,
} from 'graphql';
import * as Storage from '../storage';
import {
  getArgsFromOpts,
  getRenamedMongooseFields,
} from './commons';


export function getByListResolver(typeName, resolverOpts = {}) {
  const mongooseModel = Storage.MongooseModels.get(typeName);

  if (!mongooseModel) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`graphql-mongoose warn: could not find model '${typeName}' `
        + `for getByListResolver. You should call populateModels(${typeName}).`);
    }
  }

  const args = {
    ids: {
      name: 'ids',
      type: new GraphQLList(GraphQLID),
    },
    limit: {
      name: 'limit',
      type: GraphQLInt,
    },
    skip: {
      name: 'skip',
      type: GraphQLInt,
    },
    ...getArgsFromOpts(typeName, resolverOpts),
  };

  const renamedFields = getRenamedMongooseFields(mongooseModel);
  const projectionFn = renamedFields
    ? projectionFixRenamed.bind(this, renamedFields)
    : projection;

  const resolve = (root, queryArgs = {}, context, info) => {
    const { ids, limit, skip, sort, filter } = queryArgs;

    if (mongooseModel) {
      const selector = Object.assign({}, filter ? dotObject(filter) : null);

      if (Array.isArray(ids)) {
        selector._id = {
          $in: ids.map((id) => getClearId(id)),
        };
      }

      return mongoose.getList(
        mongooseModel,
        selector,
        { sort, limit, skip },
        projectionFn(info)
      );
    }

    return null;
  };

  return { args, resolve };
}
