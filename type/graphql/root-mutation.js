/* eslint-disable arrow-body-style */

import { GraphQLObjectType } from 'graphql/type';
import * as Storage from '../../storage';


export function getRootMutationType() {
  const name = 'RootMutation';

  return Storage.getTypeWithCache(name, () => {
    return new GraphQLObjectType({
      name,
      fields: Storage.AdditionalFields.get('RootMutation'),
    });
  });
}
