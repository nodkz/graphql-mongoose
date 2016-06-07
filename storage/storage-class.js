
export default class StorageClass {
  constructor() {
    this.data = {};
  }

  get(key) {
    if (this.has(key)) {
      return this.data[key];
    }
  }

  getSubKey(key, subKey) {
    if (this.hasSubKey(key)) {
      return this.data[key][subKey];
    }
  }

  getWithDefault(key, defaultValue) {
    if (this.has(key)) {
      return this.data[key];
    }

    return defaultValue;
  }

  set(key, val) {
    this.data[key] = val;
  }

  setSubKey(key, subKey, val) {
    if (!this.has(key)) {
      this.data[key] = {};
    }
    this.data[key][subKey] = val;
  }

  del(key) {
    delete this.data[key];
  }

  delSubKey(key, subKey) {
    if (this.data[key]) {
      delete this.data[key][subKey];
    }
  }

  has(key) {
    return this.data.hasOwnProperty(key);
  }

  hasSubKey(key, subKey) {
    return this.has(key) && this.data[key].hasOwnProperty(subKey);
  }

  getAll() {
    return this.data;
  }

  count() {
    return Object.keys(this.data).length;
  }

  forEveryKey(cb) {
    const keys = Object.keys(this.data);
    keys.forEach((key) => cb(key, this.data[key]));
  }

  forEverySubKey(cb) {
    const keys = Object.keys(this.data);
    keys.forEach((key) => {
      Object.keys(this.data[key]).forEach((subKey) => {
        cb(key, subKey, this.data[key][subKey]);
      });
    });
  }
}
