/* eslint-disable no-use-before-define, no-else-return, no-param-reassign */

import { globalIdField } from 'graphql-relay';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLObjectType,
  GraphQLEnumType,
} from 'graphql/type';
import GraphQLDate from './custom/date';
import GraphQLBuffer from './custom/buffer';
import GraphQLGeneric from './custom/generic';
import GraphQLReference from './custom/reference';
import * as Resolver from '../resolver';
import * as Storage from '../storage';
import { nodeInterface, getConnectionType } from './graphql';
import mongoose from 'mongoose';
import objectPath from 'object-path';
import {
  getTypeFields,
  setTypeFields,
  addTypeFields,
  omit,
} from '../utils';


/**
 * Returns a concatenation of type and field name
 */
function getTypeFieldName(typeName, fieldName) {
  const fieldNameCapitalized = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  return `${typeName}${fieldNameCapitalized}`;
}


function stringToGraphQLType(type) {
  switch (type) {
    case 'String':
      return GraphQLString;
    case 'Number':
      return GraphQLFloat;
    case 'Date':
      return GraphQLDate;
    case 'Buffer':
      return GraphQLBuffer;
    case 'Boolean':
      return GraphQLBoolean;
    case 'ObjectID':
      return GraphQLID;
    default:
      return GraphQLGeneric;
  }
}


/**
 * Create pseudo MongooseModel from mongoose field
 */
function modelFromMongooseField(mongooseField, prefixName = '') {
  let modelName = getTypeFieldName(prefixName, mongooseField.path);
  const optName = objectPath.get(mongooseField, 'schema.options.graphQL.typeConfig.name');
  if (optName) {
    modelName = optName;
  }

  return Object.assign(
    { modelName },
    mongooseField
  );
}


function getTypeFromEnum(typeName, valueList = [], description = null) {
  return Storage.getTypeWithCache(typeName, () => {
    const graphQLEnumValues = valueList.reduce((result, val) => {
      result[val] = { value: val }; // eslint-disable-line no-param-reassign
      return result;
    }, {});

    return new GraphQLEnumType({
      name: typeName,
      description,
      values: graphQLEnumValues,
    });
  });
}


function fieldToGraphQLType(mongooseField, parentTypeName = '') {
  let fieldName = mongooseField.path;
  const fieldType = mongooseField.instance;

  const otherName = objectPath.get(mongooseField, 'options.graphQL.name');
  if (otherName) {
    fieldName = otherName;
  }

  if (mongooseField instanceof mongoose.Schema.Types.DocumentArray) {
    const subModel = modelFromMongooseField(mongooseField, parentTypeName);
    return new GraphQLList(
      getTypeFromModel(subModel, parentTypeName)
    );
  } else if (fieldType === 'Embedded'
    || mongooseField instanceof mongoose.Schema.Types.Embedded) {
    const subModel = modelFromMongooseField(mongooseField, parentTypeName);
    return getTypeFromModel(subModel);
  } else if (fieldType === 'Array' && objectPath.has(mongooseField, 'caster.instance')) {
    const unwrappedField = Object.assign({}, mongooseField);
    unwrappedField.instance = mongooseField.caster.instance;
    if (unwrappedField.instance === 'ObjectID') {
      const refModelName = objectPath.get(mongooseField, 'options.ref');
      if (refModelName) {
        Storage.UnresolvedRefs.setSubKey(parentTypeName, fieldName, {
          refModelName,
          wrapper: (type) => objectPath.get(mongooseField, 'options.graphQL.type') !== 'Array'
            ? getConnectionType(type) : new GraphQLList(type),
        });
        return GraphQLReference;
      }
    }
    objectPath.set(mongooseField, 'options.graphQL.type', 'Array');
    return new GraphQLList(fieldToGraphQLType(unwrappedField, parentTypeName));
  } else if (mongooseField.enumValues && mongooseField.enumValues.length > 0) {
    return getTypeFromEnum(
      getTypeFieldName(`Enum${parentTypeName}`, fieldName),
      mongooseField.enumValues,
      mongooseField.options ? mongooseField.options.description : null
    );
  } else if (fieldType === 'ObjectID') {
    const refModelName = objectPath.get(mongooseField, 'options.ref');
    if (refModelName) {
      Storage.UnresolvedRefs.setSubKey(parentTypeName, fieldName, { refModelName });
      return GraphQLReference;
    }
  }

  return stringToGraphQLType(fieldType);
}


function convertDotFieldsToEmbedded(fields, typeName) {
  // convert only one dot-level on this step to EmbeddedModel
  // further when converting EmbeddedModel to GQL, it internally
  // call this method to extract deep fields with dots

  const result = {};

  Object.keys(fields).forEach((fieldName) => {
    const dotIdx = fieldName.indexOf('.');
    if (dotIdx === -1) {
      result[fieldName] = fields[fieldName];
    } else {
      // create pseudo schema
      const name = fieldName.substr(0, dotIdx);
      if (!result.hasOwnProperty(name)) {
        result[name] = {
          instance: 'Embedded',
          path: name,
          schema: {
            options: {
              graphQL: {
                noGlobalId: true,
                name: getTypeFieldName(typeName, name),
              },
            },
            paths: {},
          },
        };
      }
      const subName = fieldName.substr(dotIdx + 1);
      result[name].schema.paths[subName] = Object.assign({}, fields[fieldName], { path: subName });
    }
  });

  return result;
}


function getFieldResolver(mongooseField, fieldName, typeFromOpts, resolverOpts = {}) {
  /*
  resolverOpts ={ // can be false, to disable resolving
    type: 'Connection', // or 'Array', connection by default,
    sort: [], // or false, to disable sort
    filter: {}, // or false, to disable filter
    args: null, // args for field in graphQL notation
    resolve: null, // promise for resolving data
  }
  */

  let resolver = {};

  // create resolver from mongoose `ref` option on field
  const options = mongooseField.options || {};
  const refModelName = options.ref;
  if (refModelName) {
    if (mongooseField.instance === 'Array') {
      if (typeFromOpts === 'Array') {
        const regularResolver = Resolver.getByListResolver(refModelName, resolverOpts);
        resolver = {
          args: omit(regularResolver.args, 'ids'),
          resolve: (obj, args, context, info) =>
            regularResolver.resolve(obj, { ...args, ids: obj[fieldName] }, context, info),
        };
      } else { // type === 'Connection'
        const regularResolver = Resolver.getByConnectionResolver(refModelName, resolverOpts);
        resolver = {
          args: omit(regularResolver.args, 'ids'),
          resolve: (obj, args, context, info) =>
            regularResolver.resolve(obj, { ...args, ids: obj[fieldName] }, context, info),
        };
      }
    } else {
      const regularResolver = Resolver.getByIdResolver(refModelName, resolverOpts);
      resolver = {
        args: omit(regularResolver.args, 'id'),
        resolve: (obj, args, context, info) =>
          regularResolver.resolve(obj, { ...args, id: obj[fieldName] }, context, info),
      };
    }
  }


  // create resolver from mongoose `refType` option on field (type stored in document)
  const refPath = options.refPath;
  if (refPath) { // should get modelName from document field on the fly
    const undefinedResolver = Resolver.getByIdResolver(undefined, resolverOpts);
    resolver = {
      args: omit(undefinedResolver.args, 'id'),
      resolve: (obj, args, context, info) => {
        const refModelNameOnFly = objectPath.get(obj, refPath);
        if (refModelNameOnFly) {
          const { resolve } = Resolver.getByIdResolver(refModelNameOnFly, resolverOpts);
          return resolve(obj, { ...args, id: obj[fieldName] }, context, info);
        }
        return null;
      },
    };
  }

  return resolver;
}


function getFieldsFromModel(mongooseModel, typeName) {
  const fields = {};
  const paths = convertDotFieldsToEmbedded(mongooseModel.schema.paths, typeName);

  Object.keys(paths).forEach((path) => {
    const mongooseField = paths[path];
    let fieldName = path;
    const fieldOpts = mongooseField.options || {};
    const graphQLOpts = fieldOpts.graphQL || {};

    if (graphQLOpts.name) {
      fieldName = graphQLOpts.name;
    }

    // skip hidden fields
    if (fieldName.startsWith('__') || fieldOpts.graphQL === false) {
      return;
    }

    const type = fieldToGraphQLType(mongooseField, typeName);
    const fieldConfig = {
      type,
      description: fieldOpts.description,
    };

    if (graphQLOpts.resolver !== false) {
      let resolver;

      if (graphQLOpts.resolver && graphQLOpts.resolver.resolve) {
        // get resolver from MongooseSchema field's options
        resolver = { args: graphQLOpts.resolver.args, resolve: graphQLOpts.resolver.resolve };
      } else {
        resolver = getFieldResolver(
          mongooseField, fieldName, graphQLOpts.type, graphQLOpts.resolver
        );
      }

      // if changed fieldName via MongooseSchema field's options, make new field with this name
      if (graphQLOpts.name && graphQLOpts.name !== path) {
        fieldConfig.mongooseFieldName = path; // store for projection, to query proper fieldName

        if (resolver) {
          const childResolve = resolver.resolve;
          resolver.resolve = (obj, args, context, info) => {
            obj[fieldName] = obj[path]; // eslint-disable-line
            return childResolve(obj, args, context, info);
          };
        } else {
          resolver = {
            resolve: (obj) => obj[path],
          };
        }
      }

      if (resolver) {
        fieldConfig.args = resolver.args;
        fieldConfig.resolve = resolver.resolve;
      }
    }

    if (mongooseField.defaultValue) {
      fieldConfig.defaultValue = mongooseField.defaultValue;
    }

    fields[fieldName] = fieldConfig;
  });

  return fields;
}


function hasModelGlobalId(mongooseModel) {
  if (objectPath.get(mongooseModel, 'schema.options.graphQL.noGlobalId')) {
    return false;
  }
  return mongooseModel.schema.paths && mongooseModel.schema.paths._id;
}


function getTypeFromModel(mongooseModel, initTypeConfig = {}) {
  const schemaTypeConfig = objectPath.get(mongooseModel, 'schema.options.graphQL.typeConfig');
  if (schemaTypeConfig) {
    initTypeConfig = Object.assign({}, schemaTypeConfig, initTypeConfig);
  }

  // initTypeConfig.name have priority under mongoose model name
  const typeName = initTypeConfig.name || mongooseModel.modelName;

  return Storage.getTypeWithCache(typeName, () => {
    const typeConfig = {
      name: typeName,
      interfaces: [],
      description: initTypeConfig.description,
      fields: {},
    };

    if (hasModelGlobalId(mongooseModel)) {
      typeConfig.interfaces.push(nodeInterface);
      // id field can be overridden from initTypeConfig for changing default idFetcher
      if (!initTypeConfig.fields || !initTypeConfig.fields.id) {
        typeConfig.fields.id = globalIdField(typeConfig.name, (obj) => obj._id);
      }
    }
    if (initTypeConfig.interfaces) {
      typeConfig.interfaces = [...typeConfig.interfaces, ...initTypeConfig.interfaces];
    }

    if (initTypeConfig.fields) {
      typeConfig.fields = Object.assign(typeConfig.fields, initTypeConfig.fields);
    }

    const GraphQLType = new GraphQLObjectType(typeConfig);

    // Save to cache explicitly, before getting fields from model
    // For self-reference type resolving
    Storage.Types.set(typeName, GraphQLType);

    const derivedFields = getFieldsFromModel(mongooseModel, typeName);

    // fields can be created only after type announcing, because model can includes itself
    setTypeFields(GraphQLType,
      Object.assign(
        derivedFields, // get fields derived from mongoose model
        getTypeFields(GraphQLType) // override fields from initTypeConfig
      )
    );

    return GraphQLType;
  });
}


function resolveUnresolvedRefs() {
  Storage.UnresolvedRefs.forEverySubKey((typeName, fieldName, { refModelName, wrapper }) => {
    const Type = Storage.Types.get(typeName);
    if (Type) {
      if (fieldName && refModelName) {
        const refModel = Storage.MongooseModels.get(refModelName);
        if (refModel) {
          let fieldType = getTypeFromModel(refModel);
          if (wrapper) {
            fieldType = wrapper(fieldType);
          }
          const fields = getTypeFields(Type);
          if (!fields[fieldName]) {
            fields[fieldName] = {};
          }
          fields[fieldName].type = fieldType;
          setTypeFields(Type, fields);
          Storage.UnresolvedRefs.delSubKey(typeName, fieldName);
        }
      }
    }
  });

  Storage.UnresolvedRefs.forEverySubKey((typeName, fieldName, { refModelName }) => {
    console.log(`graphql-mongoose warning: ` +
      `can not get Type for ref with name '${refModelName}' in '${typeName}.${fieldName}'`);
  });
}


function addAdditionalFields() {
  Storage.AdditionalFields.forEveryKey((typeName, additionalFields) => {
    const Type = Storage.Types.get(typeName);
    if (Type) {
      addTypeFields(Type, additionalFields);
    }
  });
}


export {
  getTypeFromModel,
  resolveUnresolvedRefs,
  addAdditionalFields,
};
