import mongoose from 'mongoose';

export function getIndexesFromModel(mongooseModel, extractCompound = true) {
  const indexedFields = [];

  // add _id field if existed
  if (mongooseModel.schema.paths._id) {
    indexedFields.push({ _id: 1 });
  }

  // scan all fields on index presence [MONGOOSE FIELDS LEVEL INDEX]
  Object.keys(mongooseModel.schema.paths).forEach((name) => {
    if (mongooseModel.schema.paths[name]._index) {
      indexedFields.push({ [name]: 1 }); // ASC by default
    }
  });

  // scan compound indexes [MONGOOSE SCHEMA LEVEL INDEXES]
  if (Array.isArray(mongooseModel.schema._indexes)) {
    mongooseModel.schema._indexes.forEach((idxData) => {
      const partialIndexes = {};
      const idxFields = idxData[0];
      if (!extractCompound) {
        indexedFields.push(idxFields);
      } else {
        // extract partial indexes from compound index
        // { name: 1, age: 1, salary: 1} -> [ {name:1}, {name:1, age:1}, {name:1, age:1, salary:1}
        Object.keys(idxFields).forEach((fieldName) => {
          partialIndexes[fieldName] = idxFields[fieldName];
          indexedFields.push(Object.assign({}, partialIndexes));
        });
      }
    });
  }

  return indexedFields;
}

export function toObjectId(str) {
  // return mongoose.mongo.ObjectId(str);
  return new mongoose.Types.ObjectId(str);
}
