/* eslint-disable arrow-body-style */

import { GraphQLObjectType } from 'graphql/type';
import * as Storage from '../../storage';
import { getNodeFieldConfig } from './node';
import { getViewerFieldConfig } from './viewer';


export function getRootQueryType() {
  const name = 'RootQuery';

  return Storage.getTypeWithCache(name, () => {
    return new GraphQLObjectType({
      name,
      fields: {
        viewer: getViewerFieldConfig(),
        node: getNodeFieldConfig(),
      },
    });
  });
}
