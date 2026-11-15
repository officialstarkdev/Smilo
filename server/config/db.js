import mongoose from 'mongoose';

/*
 * Connects to MONGO_URI. If that fails, falls back to a small in-memory
 * stand-in for the Mongoose model API so the app runs without a database.
 *
 * The fallback is for local development only:
 *  - data is lost on restart (it re-seeds every boot)
 *  - it supports just the query operators this codebase uses
 *  - unique indexes are not enforced (booking writes are serialised by
 *    utils/lock.js instead)
 * Use a real MongoDB (docker compose up -d) for anything beyond a demo.
 */

const originalConnect = mongoose.connect;
const stores = {};

const getStore = (name) => (stores[name] ??= []);

// Which model a populated path points at.
const REF_MODELS = {
  dentist: 'Dentist',
  treatment: 'Treatment',
  treatments: 'Treatment',
  room: 'Room',
  user: 'User',
};

const toPlain = (d) => (d && typeof d.toObject === 'function' ? d.toObject() : d ? { ...d } : d);
const same = (a, b) => String(a) === String(b);

function matches(itemVal, cond) {
  if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date) && !cond._bsontype) {
    if ('$in' in cond && !cond.$in.some((v) => same(v, itemVal))) return false;
    if ('$nin' in cond && cond.$nin.some((v) => same(v, itemVal))) return false;
    if ('$ne' in cond && same(cond.$ne, itemVal)) return false;
    if ('$gte' in cond && !(itemVal >= cond.$gte)) return false;
    if ('$lte' in cond && !(itemVal <= cond.$lte)) return false;
    if ('$gt' in cond && !(itemVal > cond.$gt)) return false;
    if ('$lt' in cond && !(itemVal < cond.$lt)) return false;
    return true;
  }
  // Mongo semantics: { tags: x } matches when the array contains x
  if (Array.isArray(itemVal)) return itemVal.some((v) => same(v, cond));
  return same(itemVal, cond);
}

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

function filterData(store, query) {
  if (!query || Object.keys(query).length === 0) return [...store];
  return store.filter((item) =>
    Object.entries(query).every(([key, cond]) => {
      if (key === '$or') return cond.some((sub) => filterData([item], sub).length > 0);
      return matches(getPath(item, key), cond);
    })
  );
}

function pickFields(doc, fields) {
  if (!fields || typeof fields !== 'string') return doc;
  const out = { _id: doc._id };
  for (const k of fields.split(' ').filter(Boolean)) if (doc[k] !== undefined) out[k] = doc[k];
  return out;
}

// Returns a new plain object; never mutates the stored document.
function populateItem(item, path, fields) {
  const plain = toPlain(item);
  const refStore = stores[REF_MODELS[path]];
  if (!plain || !refStore || plain[path] == null) return plain;

  const resolve = (id) => {
    const ref = refStore.find((d) => same(d._id, id?._id ?? id));
    return ref ? pickFields(toPlain(ref), fields) : id;
  };
  plain[path] = Array.isArray(plain[path]) ? plain[path].map(resolve) : resolve(plain[path]);
  return plain;
}

class MockQuery {
  constructor(data) {
    this.data = data;
  }
  sort(sortObj) {
    if (!sortObj || !Array.isArray(this.data)) return this;
    const keys = Object.entries(sortObj);
    this.data.sort((a, b) => {
      for (const [key, order] of keys) {
        const va = getPath(a, key);
        const vb = getPath(b, key);
        if (va === vb) continue;
        if (va === undefined) return 1;
        if (vb === undefined) return -1;
        const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
        if (cmp !== 0) return order === -1 ? -cmp : cmp;
      }
      return 0;
    });
    return this;
  }
  select() {
    return this;
  }
  lean() {
    this.data = Array.isArray(this.data) ? this.data.map(toPlain) : toPlain(this.data);
    return this;
  }
  limit(num) {
    if (Array.isArray(this.data)) this.data = this.data.slice(0, num);
    return this;
  }
  populate(path, fields) {
    if (Array.isArray(this.data)) this.data = this.data.map((item) => populateItem(item, path, fields));
    else if (this.data) this.data = populateItem(this.data, path, fields);
    return this;
  }
  then(resolve, reject) {
    return Promise.resolve(this.data).then(resolve, reject);
  }
}

function applyUpdate(item, update) {
  Object.assign(item, update.$set || update);
  item.updatedAt = new Date();
}

function mockModel(RealModel, name) {
  const store = getStore(name);

  RealModel.deleteMany = async () => {
    const n = store.length;
    store.length = 0;
    return { deletedCount: n };
  };
  RealModel.insertMany = async (array) => {
    const docs = [];
    for (const item of array) {
      const doc = new RealModel(item);
      await doc.save();
      docs.push(doc);
    }
    return docs;
  };
  RealModel.create = async function (data) {
    if (Array.isArray(data)) return this.insertMany(data);
    const doc = new RealModel(data);
    await doc.save();
    return doc;
  };
  RealModel.find = (query) => new MockQuery(filterData(store, query));
  RealModel.findOne = (query) => new MockQuery(filterData(store, query)[0] || null);
  RealModel.findById = (id) => new MockQuery(store.find((d) => same(d._id, id)) || null);
  RealModel.findByIdAndUpdate = async (id, update) => {
    const item = store.find((d) => same(d._id, id));
    if (!item) return null;
    applyUpdate(item, update);
    await item.validate();
    return item;
  };
  RealModel.updateOne = async (query, update) => {
    const results = filterData(store, query);
    if (results[0]) applyUpdate(results[0], update);
    return { matchedCount: results.length, modifiedCount: results.length ? 1 : 0 };
  };
  RealModel.countDocuments = async (query) => filterData(store, query).length;

  RealModel.prototype.save = async function () {
    await this.validate(); // schema validators still run without a DB
    const idx = store.findIndex((item) => same(item._id, this._id));
    this.updatedAt = new Date();
    if (idx === -1) {
      this.createdAt ??= new Date();
      store.push(this);
    } else {
      store[idx] = this;
    }
    return this;
  };
}

function applyInMemoryMock() {
  mongoose.connect = async () => {};
  mongoose.disconnect = async () => {};
  for (const [name, RealModel] of Object.entries(mongoose.models)) mockModel(RealModel, name);
}

export async function connectDB({ seedIfEmpty = true } = {}) {
  const production = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGO_URI || (production ? '' : 'mongodb://127.0.0.1:27017/smilo');
  const { seedData } = await import('../seed_helper.js');

  if (!uri) throw new Error('MONGO_URI is not set. In production the API needs a real database.');

  try {
    console.log(`Connecting to MongoDB at ${uri.replace(/\/\/[^@]*@/, '//***@')}…`);
    await originalConnect.call(mongoose, uri, { serverSelectionTimeoutMS: production ? 15000 : 4000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}`);

    const count = await mongoose.model('Treatment').countDocuments({});
    if (count === 0 && seedIfEmpty) {
      // Production: catalogue + admin from env only, no demo patients.
      console.log('Database is empty. Seeding initial data…');
      await seedData({ production });
    }
    return { mode: 'mongo' };
  } catch (err) {
    // Never silently fall back in production: bookings would vanish on restart.
    if (production) throw new Error(`Could not connect to MongoDB: ${err.message}`);
    console.log(`Could not connect to MongoDB (${err.message}).`);
    console.log('Falling back to the in-memory dev store. Data resets on restart.');
    applyInMemoryMock();
    await seedData();
    return { mode: 'memory' };
  }
}
