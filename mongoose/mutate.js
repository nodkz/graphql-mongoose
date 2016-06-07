export function createOne(Collection, args) {
  const document = new Collection(args);
  return document.save().then((result) => {
    if (result) {
      return {
        ...result.toObject(),
        _type: Collection.modelName, // for Node type resolver
      };
    }

    return null;
  });
}


export function updateById(Collection, id, args) {
  /*
  args.forEach((arg, key) => {
    if (key.endsWith('_add')) {
      const values = args[key];
      args.$push = {
        [key.slice(0, -4)]: { $each: values },
      };
      delete args[key];
    }
  });
  */

  return Collection.update({ _id: id }, args).then((res) => {
    if (res.ok) {
      return true;
    }

    return null;
  });
}


export function deleteById(Collection, id) {
  return Collection.remove({ _id: id }).then(({ result }) => ({
    id,
    ok: !!result.ok,
  }));
}
