import StorageClass from './storage-class';


// All output types
export const Types = new StorageClass();


// Link mongoose models to generated types, used by reference resolvers
export const MongooseModels = new StorageClass();


// Additional fields for any Type, BTW can extend RootQuery, Viewer.
// eg. run it before `getSchema` method
//   Storage.AdditionalFields.setSubKey('RootQuery', fieldName, fieldConfig);
//   Storage.AdditionalFields.setSubKey('Viewer',    fieldName, fieldConfig);
export const AdditionalFields = new StorageClass();

// When Types creating (via `addModel`), all fields with refs saved to this storage.
// Right before of GraphQL schema construction, we have all Types and can change field.type
// for correct type via `resolveUnresolvedRefs` ;)
export const UnresolvedRefs = new StorageClass();


export function getTypeWithCache(name, createCallback) {
  const storedType = Types.get(name);
  if (storedType) {
    return storedType;
  }

  const type = createCallback();
  Types.set(name, type);
  return type;
}
