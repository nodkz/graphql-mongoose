export function getById(Collection, id, projection = null) {
  return Collection.findById(id, projection).then((result) => {
    if (result) {
      return {
        ...result.toObject(),
        _type: Collection.modelName, // for Node type resolver
      };
    }

    return null;
  });
}


export function getList(Collection, selector, options = {}, projection = null) {
  return Collection.find(selector, projection, options).then((result) => (
    result.map((value) => ({
      ...value.toObject(),
      _type: Collection.modelName, // for Node type resolver
    }))
  ));
}


export function getCount(Collection, selector) {
  return Collection.count(selector);
}
