import * as Resolver from '../../resolver';
import * as Storage from '../../storage';
import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLInterfaceType,
} from 'graphql';
import { fromGlobalId } from 'graphql-relay';
import { defaultViewerData } from './viewer';

export const nodeInterface = new GraphQLInterfaceType({
  name: 'Node',
  description: 'An object with an ID',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The id of the object.',
    },
  }),
  resolveType: (obj) => (
    obj._type ? Storage.Types.get(obj._type) : null
  ),
});


export function getNodeFieldConfig() {
  return {
    name: 'node',
    description: 'Fetches an object given its ID',
    type: nodeInterface,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLID),
        description: 'The ID of an object',
      },
    },
    resolve: (obj, { id: globalId }, context, info) => {
      const { type, id } = fromGlobalId(globalId);

      if (type === 'Viewer') {
        return defaultViewerData;
      }

      const resolver = Resolver.getByIdResolver(type);

      if (resolver.resolve) {
        return resolver.resolve({}, { id }, context, info);
      }

      return null;
    },
  };
}
