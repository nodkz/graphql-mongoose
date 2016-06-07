/* eslint-disable arrow-body-style */

import { nodeInterface } from './node';
import { GraphQLObjectType } from 'graphql/type';
import * as Storage from '../../storage';
import { globalIdField } from 'graphql-relay';
import { addTypeFields } from '../../utils';


export const defaultViewerData = {
  _type: 'Viewer',
  id: 'viewer',
};


export function getViewerType() {
  const name = 'Viewer';

  return Storage.getTypeWithCache(name, () => {
    return new GraphQLObjectType({
      name,
      interfaces: [nodeInterface],
      fields: {
        id: globalIdField(name),
      },
    });
  });
}


export function getViewerFieldConfig() {
  const ViewerType = getViewerType();

  return {
    name: ViewerType.name,
    type: ViewerType,
    resolve: () => defaultViewerData,
  };
}
