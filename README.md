# Died unpublished to npm due heavy structure of app and new middleware based module https://github.com/nodkz/graphql-compose


### Example of `schema` file:
```js
import {
  getSchema,
  addModel,
  populateModels,
  addFields,
  getTypeFromModel,
  GQLStorage,
  prepareConnectionField,
  getMutationFieldConfig,
  getClearId,
} from 'lib/graphql-mongoose';
import { User } from './user';
import { Note } from './note';
import { Cabinet } from './cabinet';
import { Cv } from './cv';
import { Job } from './job';
import { Company } from './company';
import {
  CabinetData,
  getGQLCabinetDataInterface,
  getGQLCabinetDataFieldConfig,
} from './cabinet/cabinetData';
import {
  GraphQLList,
  GraphQLInt,
  GraphQLString,
} from 'graphql/type';
import { AvatarListType } from './customTypesGQ/avatar';

populateModels([Cv, User, Note, CabinetData]);

addModel(Cv, {
  singular: true,
  plural: true,
  connection: true,
  typeConfig: {
    name: 'Cv',
    description: 'Cv description',
    interfaces: [getGQLCabinetDataInterface()],
    fields: {
      cabinetData: getGQLCabinetDataFieldConfig(),
      role: {
        type: GraphQLString,
        resolve: (obj) => {
          if ((Date.parse(obj.createdAt) - Date.now()) / 1000 > - 2 * 3600) {
            return 'owner';
          }
        },
      },
    },
  },
  listConfig: {
    filter: [],
    orderBy: [],
  },
  mutations: {
    create: {},
    update: {},
    delete: {},
  },
});
addModel(Job, {
  typeConfig: {
    interfaces: [getGQLCabinetDataInterface()],
    fields: {
      cabinetData: getGQLCabinetDataFieldConfig(),
    },
  },
});
addModel(Company, {
  typeConfig: {
    interfaces: [getGQLCabinetDataInterface()],
    fields: {
      cabinetData: getGQLCabinetDataFieldConfig(),
    },
  },
});
addModel(User);
// addModel(Note); added in app/_schema/cabinet/cabinetData.js with mutation overriding


addFields('Viewer', {
  myCabinet: {
    type: getTypeFromModel(Cabinet),
    resolve: (obj, args, context) => context.cabinetPromise,
  },
});

addFields('Cabinet', {
  otherCabinets: {
    type: new GraphQLList(GQLStorage.Types.get('Cabinet')),
    resolve: (obj, args, context) => {
      return Cabinet.find({
        _id: { $ne: context.cabinetId },
        $or: [
          { users: context.userEmail },
          { owner: context.userEmail },
        ],
      });
    },
  },
  cvConnection: prepareConnectionField(GQLStorage.Types.get('Cv')),
  jobConnection: prepareConnectionField(GQLStorage.Types.get('Job')),
  usersWithAvatar: {
    type: AvatarListType,
    resolve: (obj) => obj.users || [],
  },
  usersCount: {
    type: GraphQLInt,
    resolve: (obj) => (obj.users || []).length,
  },
});

addFields('RootMutation', {
  cabinetAddEmail: getMutationFieldConfig({
    actionName: 'addEmailTo',
    nodeType: GQLStorage.Types.get('Cabinet'),
    description: 'Add email to cabinet, as invited user which has access',
    input: {
      fields: {
        email: {
          type: GraphQLString,
        },
      },
    },
    output: {
      addFields: {
        cabinetId: {
          type: GraphQLString,
          resolve: (obj, args, context) => context.cabinetId,
        },
      },
    },
    mutateAndGetPayload: (inputData, context) => {
      if (!inputData.email) {
        return context.cabinetPromise;
      }

      // read article http://tech-blog.maddyzone.com/node/add-update-delete-object-array-schema-mongoosemongodb
      return Cabinet.findByIdAndUpdate(
        context.cabinetId,
        { $addToSet: { users: inputData.email } },
        { safe: true, upsert: true, new: true }
      ).then(doc => doc.toObject());
    },
  }),
  cabinetRemoveEmail: getMutationFieldConfig({
    actionName: 'removeEmailFrom',
    nodeType: GQLStorage.Types.get('Cabinet'),
    description: 'Add email to cabinet, as invited user which has access',
    input: {
      fields: {
        email: {
          type: GraphQLString,
        },
      },
    },
    output: {
      addFields: {
        cabinetId: {
          type: GraphQLString,
          resolve: (obj, args, context) => context.cabinetId,
        },
      },
    },
    mutateAndGetPayload: (inputData, context) => {
      // read article http://tech-blog.maddyzone.com/node/add-update-delete-object-array-schema-mongoosemongodb
      return Cabinet.findByIdAndUpdate(
        context.cabinetId,
        { $pull: { users: inputData.email } },
        { safe: true, upsert: true, new: true }
      ).then(doc => doc.toObject());
    },
  }),
});

const Schema = getSchema();
export default Schema;
```

### Example of `Cv` mongoose schema
```js
import mongoose, { Schema } from 'mongoose';

import { CvContactsSchema } from './contacts';
import { CvEducationSchema } from './education';
import { enumEmployment } from '../enums/employment';
import { CvExperienceSchema } from './experience';
import { LanguagesSchema } from './languages';
import { CvStatsSchema } from './stats';


export const CvSchema = new Schema(
  {
    nod: {
      nod1: String,
      nod2: {
        nod21: String,
        nod22: String,
      },
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      graphQL: {
        name: 'friend',
      },
    },

    users: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      graphQL: {
        name: 'friends',
        type: 'Connection', // or `Array`, `Connection` by default,
        resolver: { // can be false, to disable resolving
          sort: [], // or false, to disable sort
          filter: {}, // or false, to disable filter
          args: null, // args for field in graphQL notation
          resolve: null, // promise for resolving data
        },
      },
    },

    name: {
      type: String,
      description: 'Person name',
    },

    position: {
      type: String,
      description: 'Person main position in resume, eg. "Sales manager"',
    },

    careerObjective: {
      type: [String],
      default: [],
      description: 'List of additional positions, which person consider',
    },

    salary: {
      type: String,
      description: 'Salary with currency symbol',
    },

    employment: {
      type: [{
        type: String,
        enum: Object.keys(enumEmployment),
      }],
      description: 'List of desired employment types',
      index: true,
    },

    description: {
      type: String,
      description: 'Free text',
    },

    age: {
      type: String,
      description: 'Age',
    },

    gender: {
      type: String,
      description: 'Gender (1 - male, 2 - female, 3 - ladyboy)',
    },

    location: {
      type: String,
      description: 'Current place of stay (country or city)',
    },

    relocation: {
      type: Boolean,
      description: 'Does candidate relocate to another region',
    },

    citizenship: {
      type: String,
      description: 'Country of citizenship',
    },

    workPerms: {
      type: [String],
      description: 'List of countries, where candidate has permissions to work',
    },

    contacts: {
      type: CvContactsSchema,
      description: 'Contacts of person (phone, skype, mail and etc)',
    },

    skills: {
      type: [String],
      default: [],
      description: 'List of skills',
    },

    languages: {
      type: [LanguagesSchema],
      default: [],
      description: 'Knowledge of languages',
    },

    totalExperience: {
      type: Number,
      description: 'Work experience in months',
    },

    experience: {
      type: [CvExperienceSchema],
      default: [],
      description: 'List of places of work',
    },

    createdAt: {
      type: String,
      index: true,
    },

    updatedAt: {
      type: String,
    },

    touchedAt: {
      type: String,
    },

    stats: {
      type: CvStatsSchema,
      description: 'Total views and purchases',
    },

    education: {
      type: CvEducationSchema,
      description: 'Data of educational institutions',
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { virtuals: true },
  }
);

CvSchema.index({ name: 1, position: -1 }); // example of compound index, may be removed


CvSchema.virtual('name333').get(function () {
  return '!!!!!!!!' + this._id + '!!!!!!!!';
});


export const Cv = mongoose.model('Cv', CvSchema);
```

### More hardcore thing `CabinetData`
```js
/* eslint-disable no-use-before-define, no-param-reassign  */

import mongoose, { Schema } from 'mongoose';
import { ReferSchema } from './../customTypes/refer';
import { FavSchema } from './../customTypes/fav';

import {
  GraphQLInterfaceType,
  GraphQLID,
  GraphQLNonNull,
} from 'graphql';
import {
  addModel,
  GQLStorage,
  GQLResolver,
  nodeInterface,
  getConnectionType,
  populateModels,
  getClearId,
  getById,
  createOne,
  updateById,
  omit,
} from 'graphql-mongoose';
import { globalIdField } from 'graphql-relay';
import { Cabinet } from './index';
import { Note } from './../note';


export const CabinetDataSchema = new Schema(
  {
    cabinet: { type: Schema.Types.ObjectId, ref: 'Cabinet', index: true },
    refer: ReferSchema,
    isHidden: { type: Boolean, default: false },
    lastNote: String,
    fav: FavSchema,
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    collection: 'cabinet_data',
    graphQL: {
      typeConfig: {
        name: 'CabinetData',
        fields: {
          id: globalIdField('CabinetData', (obj) => {
            if (obj.refer && obj.refer.i && obj.refer.t) {
              return `${obj.refer.t}.${obj.refer.i}`;
            }
            return obj._id;
          }),
        },
      },
      mutations: {
        update: {
          input: {
            addFields: {
              _id: { type: GraphQLID },
            },
          },
          output: {
            addFields: () => ({
              changedRefer: {
                type: nodeInterface,
                resolve: (obj, args, info) => {
                  if (!obj.refer || !obj.refer.t || !obj.refer.i) return null;
                  const resolver = GQLResolver.getByIdResolver(obj.refer.t);
                  return resolver.resolve ? resolver.resolve({}, { id: obj.refer.i }, info) : null;
                },
              },
            }),
          },
          mutateAndGetPayload: (inputData, context) => {
            const cabinetId = context.cabinetId;

            const id = inputData._id || getClearId(inputData.id);
            if (id.indexOf('.') !== -1) {
              const [t, i] = id.split('.');
              const objData = Object.assign(
                {},
                getEmptyCabinetData(cabinetId, { t, i }),
                omit(inputData, 'id')
              );
              return createOne(CabinetData, objData);
            }
            return updateById(CabinetData, id, omit(inputData, ['id', '_id'])).then((result) => {
              if (result === true) {
                return getById(CabinetData, id);
              }
              return null;
            });
          },
        },
      },
    },
  }
);

CabinetDataSchema.index({ 'refer.i': 1 });

CabinetDataSchema.statics.findByCabinet = function findByCabinet(cabinetId) {
  return this.find({ cabinet: cabinetId });
};

export const CabinetData = mongoose.model('CabinetData', CabinetDataSchema);


populateModels(Cabinet);
export function getEmptyCabinetData(cabinetId, refer = {}) {
  return {
    refer,
    cabinet: cabinetId,
    fav: {},
  };
}

const GQLCabinetDataType = addModel(CabinetData);

const GQLCabinetDataInterface = new GraphQLInterfaceType({
  name: 'CabinetDatable',
  description: 'An object with cabinet data (fav, notes, etc)',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The ID of an object',
    },
    cabinetData: {
      type: GQLCabinetDataType,
      description: 'Current cabinet data (fav, notes) for this object',
    },
  }),
  resolveType: (obj) => {
    let type = obj._type ? GQLStorage.Types.get(obj._type) : null;
    if (!type) {
      type = obj.cabinetData && obj.cabinetData.refer && obj.cabinetData.refer.t
        ? GQLStorage.Types.get(obj.cabinetData.refer.t)
        : null;
    }

    return type;
  },
});

export function getGQLCabinetDataInterface() {
  return GQLCabinetDataInterface;
}

export function getGQLCabinetDataFieldConfig(referResolve) {
  return {
    type: GQLStorage.Types.get('CabinetData'),
    description: 'Current cabinet data (fav, notes) for this object',
    resolve(obj, args, context, info) {
      const cabinetId = context.cabinetId;
      const refer = referResolve ? referResolve(obj) : {
        i: obj._id,
        t: obj._type,
      };

      return CabinetData.findByCabinet(cabinetId).find({ 'refer.i': refer.i })
        .select({ ...GQLResolver.projection(info), refer: 1 }).limit(1).then(
          (result) => {
            let data;
            if (result && result[0]) {
              data = {
                ...result[0].toObject(),
                _type: CabinetData.modelName,
              };
            } else {
              data = getEmptyCabinetData(cabinetId, refer);
            }
            return data;
          }
        );
    },
  };
}

const GQLNoteType = addModel(Note, {
  mutations: {
    create: {
      output: {
        addFields: () => ({
          cabinetData: getGQLCabinetDataFieldConfig((obj) => obj.refer),
        }),
      },
      prepareInputData: (inputData, context) => {
        inputData.cabinet = context.cabinetId;
        return inputData;
      },
    },
    update: {
      prepareInputData: (inputData, context) => {
        inputData.cabinet = context.cabinetId;
        return inputData;
      },
    },
    delete: {
      output: {
        addFields: () => ({
          cabinetData: getGQLCabinetDataFieldConfig((obj) => obj.refer),
        }),
      },
    },
  },
});
const noteConnectionResolver = GQLResolver.getByConnectionResolver('Note', {});

GQLStorage.AdditionalFields.setSubKey(
  GQLCabinetDataType.name,
  'notes',
  {
    type: getConnectionType(GQLNoteType),
    args: noteConnectionResolver.args,
    resolve: (obj, args, context, info) => {
      if (!obj.refer) return null;
      const newArgs = Object.assign({}, args);
      newArgs.filter = { refer: obj.refer, cabinet: context.cabinetId };
      return noteConnectionResolver.resolve(obj, newArgs, info);
    },
  }
);
```
