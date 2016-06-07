/* eslint-disable no-param-reassign, arrow-body-style */

import objectPath from 'object-path';
import * as Resolver from '../resolver';
import * as Storage from '../storage';
import {
  getNameViaOpts,
  idToCursor,
  addTypeFields,
  getTypeFields,
  omit,
  getClearId,
  isFunction,
  isObject,
  upperFirst,
} from '../utils';
import {
  getEdgeType,
  getViewerFieldConfig,
  getInputObject,
} from '../type';
import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInputObjectType,
} from 'graphql';
import {
  toGlobalId,
} from 'graphql-relay';
import {
  createOne,
  updateById,
  deleteById,
} from '../mongoose';


export function addClientMutationIdField(Type) {
  addTypeFields(Type, {
    clientMutationId: {
      type: GraphQLString, // this field specially is not required, for non Relay libs
      description: 'If clientMutationId is passed to input it will always '
      + 'be returned as-is in the payload. This way client libraries, '
      + 'like Relay, can tell results of different mutations apart.',
    },
  });

  return Type;
}

function combineFields(fields, opts) {
  let result = Object.assign({}, isFunction(fields) ? fields() : fields);

  const removeFieldNames = objectPath.get(opts, 'removeFields');
  if (removeFieldNames) {
    result = omit(result, removeFieldNames);
  }

  let addFields = objectPath.get(opts, 'addFields', {});
  if (addFields) {
    if (isFunction(addFields)) {
      addFields = addFields();
    }
    if (isObject(addFields)) {
      Object.assign(result, addFields);
    } else {
      addFields = {};
    }
  }

  return result;
}


export function getMutationOutputType(actionName, graphqlType, opts) {
  const name = getNameViaOpts(`${upperFirst(actionName)}${graphqlType.name}Payload`, opts);

  let fields = objectPath.get(opts, 'fields');

  return Storage.getTypeWithCache(name, () => {
    // If fields not provided, use this by default:
    if (!fields) {
      const changedName = `changed${graphqlType.name}`;
      const edgeName = `${changedName}Edge`;

      fields = {
        viewer: getViewerFieldConfig(),
        id: {
          type: GraphQLID,
          description: 'The ID of the mutated object.',
          resolve: (obj) => {
            if (!obj) {
              return null;
            }

            if (obj.id) {
              return obj.id;
            }
            return toGlobalId(graphqlType.name, obj._id);
          },
        },
        [changedName]: {
          type: graphqlType,
          resolve: (obj) => obj,
        },
        [edgeName]: {
          type: getEdgeType(graphqlType),
          resolve: (obj) => {
            if (!obj) {
              return null;
            }

            return {
              node: obj,
              cursor: idToCursor(obj._id),
            };
          },
        },
      };
    }

    fields = combineFields(fields, opts);

    return new GraphQLObjectType({
      name,
      fields,
      description: objectPath.get(
        opts,
        'description',
        `The payload returned from mutation of ${graphqlType.name}.`
      ),
    });
  });
}


export function getMutationInputType(actionName, graphqlType, opts) {
  const name = getNameViaOpts(`${upperFirst(actionName)}${graphqlType.name}Input`, opts);

  let inputFields = objectPath.get(opts, 'fields');
  if (!inputFields) {
    inputFields = getTypeFields(getInputObject(graphqlType));
  }

  inputFields = combineFields(inputFields, opts);

  return Storage.getTypeWithCache(name, () => {
    return new GraphQLInputObjectType({
      name,
      fields: inputFields,
    });
  });
}


export function getMutationFieldConfig(opts) {
  const { actionName, nodeType, input, output, mutateAndGetPayload, description } = opts;

  return {
    type: addClientMutationIdField(getMutationOutputType(actionName, nodeType, output)),
    description,
    args: {
      input: {
        type: addClientMutationIdField(getMutationInputType(actionName, nodeType, input)),
      },
    },
    resolve: function resolve(_, args, context, info) {
      const { input: { clientMutationId, ...restInput } } = args;
      return Promise
        .resolve(mutateAndGetPayload(restInput, context, info))
        .then((obj) => {
          const payload = {
            clientMutationId,
            ...obj,
          };
          return payload;
        });
    },
  };
}


export function prepareCreateMutation(graphqlType, opts) {
  const name = getNameViaOpts(
    `create${graphqlType.name}`,
    opts
  );

  const mongooseModel = Storage.MongooseModels.get(graphqlType.name);

  const fieldConfig = getMutationFieldConfig({
    actionName: 'create',
    nodeType: graphqlType,
    description: objectPath.get(opts, 'description'),
    input: Object.assign(
      {
        fields: undefined, // get by default from Type
        removeFields: ['_id', 'id'],
      },
      objectPath.get(opts, 'input')
    ),
    output: Object.assign(
      {
        fields: undefined, // get by default from Type
      },
      objectPath.get(opts, 'output')
    ),
    mutateAndGetPayload: objectPath.get(opts, 'mutateAndGetPayload',
      (inputData, context, info) => {
        if (opts.prepareInputData) {
          inputData = opts.prepareInputData(inputData, context, info);
        }
        return createOne(mongooseModel, inputData);
      }
    ),
  });

  return { name, ...fieldConfig };
}


export function prepareUpdateMutation(graphqlType, opts) {
  const name = getNameViaOpts(
    `update${graphqlType.name}`,
    opts
  );

  const mongooseModel = Storage.MongooseModels.get(graphqlType.name);
  const resolver = Resolver.getByIdResolver(graphqlType.name);

  const fieldConfig = getMutationFieldConfig({
    actionName: 'update',
    nodeType: graphqlType,
    description: objectPath.get(opts, 'description'),
    input: Object.assign(
      {
        fields: undefined, // get by default from Type
        removeFields: ['_id'],
      },
      objectPath.get(opts, 'input')
    ),
    output: Object.assign(
      {
        fields: undefined,
      },
      objectPath.get(opts, 'output')
    ),
    mutateAndGetPayload: objectPath.get(opts, 'mutateAndGetPayload',
      (inputData, context, info) => {
        if (opts.prepareInputData) {
          inputData = opts.prepareInputData(inputData, context, info);
        }

        const id = getClearId(inputData.id);
        return updateById(mongooseModel, id, omit(inputData, 'id')).then((result) => {
          if (result === true) {
            return resolver.resolve({}, { id }, context, info);
          }
          return null;
        });
      }
    ),
  });

  return { name, ...fieldConfig };
}


export function prepareDeleteMutation(graphqlType, opts) {
  const name = getNameViaOpts(
    `delete${graphqlType.name}`,
    opts
  );

  const mongooseModel = Storage.MongooseModels.get(graphqlType.name);
  const resolver = Resolver.getByIdResolver(graphqlType.name);

  const fieldConfig = getMutationFieldConfig({
    actionName: 'delete',
    nodeType: graphqlType,
    description: objectPath.get(opts, 'description'),
    input: Object.assign(
      {
        fields: {
          id: { type: new GraphQLNonNull(GraphQLID) },
        },
      },
      objectPath.get(opts, 'input')
    ),
    output: Object.assign(
      {
        fields: undefined, // undefined === get default input fields for `nodeType`
      },
      objectPath.get(opts, 'output')
    ),
    mutateAndGetPayload: objectPath.get(opts, 'mutateAndGetPayload',
      (inputData, context, info) => {
        if (opts.prepareInputData) {
          inputData = opts.prepareInputData(inputData, context, info);
        }

        const id = getClearId(inputData.id);
        const removedObject = resolver.resolve({}, { id }, context, info); // get full object

        return removedObject.then((data) => { // when we get object data, we may remove it
          return deleteById(mongooseModel, id).then((result) => {
            if (result.ok === true) {
              return data;
            }
            return null;
          });
        });
      }
    ),
  });

  return { name, ...fieldConfig };
}
