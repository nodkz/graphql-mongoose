/* eslint-disable no-param-reassign */

function projection(context, fieldASTs) {
  if (!context) {
    return {};
  }

  let asts = fieldASTs || context.fieldASTs;
  if (!Array.isArray(asts)) {
    asts = [asts];
  }

  // get all selectionSets
  const selections = asts.reduce((result, source) => {
    if (source.selectionSet) {
      result.push(...source.selectionSet.selections);
    }

    return result;
  }, []);

  // return fields
  return selections.reduce((list, ast) => {
    const { name, kind } = ast;

    switch (kind) {
      case 'Field':
        list[name.value] = true;
        return {
          ...list,
          ...projection(context, ast),
        };
      case 'InlineFragment':
        return {
          ...list,
          ...projection(context, ast),
        };
      case 'FragmentSpread':
        return {
          ...list,
          ...projection(context, context.fragments[name.value]),
        };
      default:
        throw new Error('Unsuported query selection');
    }
  }, {});
}


function projectionCollection(context, fieldASTs, skipLevel = null) {
  if (!context) {
    return {};
  }

  if (skipLevel === null) {
    // change null to 0, for performance reason - no check `endsWith` every time
    skipLevel = 0;

    if (context.fieldName.endsWith('Connection')) {
      skipLevel = 2;
    }
  } else {
    skipLevel = skipLevel - 1;
  }

  let asts = fieldASTs || context.fieldASTs;
  if (!Array.isArray(asts)) {
    asts = [asts];
  }

  // get all selectionSets
  const selections = asts.reduce((result, source) => {
    if (source.selectionSet) {
      result.push(...source.selectionSet.selections);
    }

    return result;
  }, []);

  // return fields
  return selections.reduce((list, ast) => {
    const { name, kind } = ast;

    switch (kind) {
      case 'Field':
        if (skipLevel <= 0 || name.value === 'count') {
          list[name.value] = true;
        }
        return {
          ...list,
          ...projection(context, ast, skipLevel),
        };
      case 'InlineFragment':
        return {
          ...list,
          ...projection(context, ast, skipLevel),
        };
      case 'FragmentSpread':
        return {
          ...list,
          ...projection(context, context.fragments[name.value], skipLevel),
        };
      default:
        throw new Error('Unsuported query selection');
    }
  }, {});
}

export function projectionFixRenamed(renamedFields, info) {
  const proj = projection(info);

  Object.keys(renamedFields).forEach((nameGQ) => {
    const nameMongoose = renamedFields[nameGQ];
    if (proj[nameGQ]) {
      delete proj[nameGQ];
      proj[nameMongoose] = true;
    }
  });

  return proj;
}

export default projection;
export {
  projection,
  projectionCollection,
  projectionFixRenamed,
};
