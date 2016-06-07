import {
  GraphQLSchema,
} from 'graphql';
import { getTypeFromModel, resolveUnresolvedRefs, addAdditionalFields } from '../type';
import * as Storage from '../storage';
import {
  prepareSingularField,
  preparePluralField,
  prepareConnectionField,
} from './query-fields';
import {
  prepareCreateMutation,
  prepareUpdateMutation,
  prepareDeleteMutation,
  getMutationFieldConfig,
  addClientMutationIdField,
} from './mutation-fields';
import { getRootQueryType, getRootMutationType, getViewerType } from '../type/graphql';
import objectPath from 'object-path';

function initGraphqlTypes() {
  // populate root types in Storage.Types
  getViewerType();
  getRootQueryType();
  getRootMutationType();

  // now all types declared, we are ready to extend types
  resolveUnresolvedRefs();
  addAdditionalFields();
}


function getSchema() {
  initGraphqlTypes();

  const fields = { query: getRootQueryType() };

  if (Storage.AdditionalFields.has('RootMutation')) {
    fields.mutation = getRootMutationType();
  }

  return new GraphQLSchema(fields);
}


/**
 * Add models to storage, for further reference resolving
 * @param mongooseModel
 */
function populateModels(mongooseModel) {
  const models = Array.isArray(mongooseModel) ? mongooseModel : [mongooseModel];

  models.forEach((model) => {
    Storage.MongooseModels.set(model.modelName, model);
  });
}


function addModel(mongooseModel, options) {
  populateModels(mongooseModel);

  const opts = Object.assign(
    {
      singular: true,   // boolean or string:name or object:{type, description, args, resolve}
      plural: true,     // boolean or string:name or object:{type, description, args, resolve}
      connection: true, // boolean or string:name or object:{type, description, args, resolve}
      typeConfig: {},   // object:{name, interfaces, description, fields}
      listResolverConfig: {
        filter: {},     // eg. { name: { type: GraphQLString }, opts: {type: GraphQLAnyInputObject}}
        sort: [],       // eg. [ {_id: 1}, { name: 1, age: -1} ]
      },
      mutations: {
        create: {},
        update: {},
        delete: {},
      },
    },
    objectPath.get(mongooseModel, 'schema.options.graphQL', {}),
    options
  );

  const graphqlType = getTypeFromModel(mongooseModel, opts.typeConfig);

  if (opts.singular) {
    const fieldConfig = prepareSingularField(graphqlType, opts.singular);
    Storage.AdditionalFields.setSubKey('RootQuery', fieldConfig.name, fieldConfig);
    Storage.AdditionalFields.setSubKey('Viewer', fieldConfig.name, fieldConfig);
  }

  if (opts.plural) {
    const fieldConfig = preparePluralField(graphqlType, opts.plural);
    Storage.AdditionalFields.setSubKey('RootQuery', fieldConfig.name, fieldConfig);
    Storage.AdditionalFields.setSubKey('Viewer', fieldConfig.name, fieldConfig);
  }

  if (opts.connection) {
    const fieldConfig =
      prepareConnectionField(graphqlType, opts.connection);

    Storage.AdditionalFields.setSubKey('RootQuery', fieldConfig.name, fieldConfig);
    Storage.AdditionalFields.setSubKey('Viewer', fieldConfig.name, fieldConfig);
  }

  if (opts.mutations) {
    if (opts.mutations.create) {
      const fieldConfig =
        prepareCreateMutation(graphqlType, opts.mutations.create);
      Storage.AdditionalFields.setSubKey('RootMutation', fieldConfig.name, fieldConfig);
    }

    if (opts.mutations.update) {
      const fieldConfig =
        prepareUpdateMutation(graphqlType, opts.mutations.update);
      Storage.AdditionalFields.setSubKey('RootMutation', fieldConfig.name, fieldConfig);
    }

    if (opts.mutations.delete) {
      const fieldConfig =
        prepareDeleteMutation(graphqlType, opts.mutations.delete);
      Storage.AdditionalFields.setSubKey('RootMutation', fieldConfig.name, fieldConfig);
    }
  }

  return graphqlType;
}

function addFields(typeName, fieldsWithConfig = {}) {
  Object.keys(fieldsWithConfig).forEach(fieldName => {
    Storage.AdditionalFields.setSubKey(typeName, fieldName, fieldsWithConfig[fieldName]);
  });
}

export {
  getSchema,
  addModel,
  populateModels,
  addFields,
  prepareSingularField,
  preparePluralField,
  prepareConnectionField,
  getMutationFieldConfig,
  addClientMutationIdField,
};
