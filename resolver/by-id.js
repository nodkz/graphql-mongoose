import { getClearId } from '../utils';
import * as mongoose from '../mongoose';
import { projection, projectionFixRenamed } from './projection';
import {
  GraphQLNonNull,
  GraphQLID,
} from 'graphql';
import * as Storage from '../storage';
import {
  getRenamedMongooseFields,
} from './commons';


export function getByIdResolver(typeName, resolverOpts = {}) {
  const args = {
    id: {
      name: 'id',
      type: new GraphQLNonNull(GraphQLID),
    },
  };

  const mongooseModel = Storage.MongooseModels.get(typeName);
  let resolve;

  if (mongooseModel) {
    const renamedFields = getRenamedMongooseFields(mongooseModel);
    const projectionFn = renamedFields
      ? projectionFixRenamed.bind(this, renamedFields)
      : projection;

    resolve = (root, queryArgs, context, info) => {
      if (mongooseModel) {
        const id = getClearId(queryArgs.id || queryArgs._id);
        return mongoose.getById(mongooseModel, id, projectionFn(info));
      }

      return null;
    };
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`graphql-mongoose warn: could not find model '${typeName}' `
        + `for getByIdResolver. You should call populateModels(${typeName}).`);
    }
  }

  return { args, resolve };
}
