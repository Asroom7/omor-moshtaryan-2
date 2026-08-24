/* idb.js — لایه‌ی دسترسی به دیتابیس IndexedDB برای اپ مدیریت مشتری
   چهار جدول: customers, products, sales, conversations
   هر رکورد دارای کلید خودکار عددی id است؛ شناسه‌ی نمایشی (C-0001 و ...) در app.js ساخته می‌شود. */

const DB_NAME = 'crm-db';
const DB_VERSION = 1;
const STORES = ['customers', 'products', 'sales', 'conversations'];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('customers')) {
        const s = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        s.createIndex('status', 'status');
        s.createIndex('nextFollowUp', 'nextFollowUp');
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('sales')) {
        const s = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        s.createIndex('customerId', 'customerId');
        s.createIndex('productId', 'productId');
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('conversations')) {
        const s = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
        s.createIndex('customerId', 'customerId');
        s.createIndex('productId', 'productId');
        s.createIndex('date', 'date');
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

const idb = {
  async add(storeName, record) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async put(storeName, record) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async get(storeName, id) {
    const store = await tx(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(storeName) {
    const store = await tx(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(storeName, id) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async getByIndex(storeName, indexName, value) {
    const store = await tx(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const idx = store.index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async clear(storeName) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async count(storeName) {
    const store = await tx(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async exportAll() {
    const out = {};
    for (const s of STORES) {
      out[s] = await idb.getAll(s);
    }
    out._exportedAt = new Date().toISOString();
    out._version = DB_VERSION;
    return out;
  },

  async importAll(data, mode = 'replace') {
    for (const s of STORES) {
      if (!Array.isArray(data[s])) continue;
      if (mode === 'replace') await idb.clear(s);
      const store = await tx(s, 'readwrite');
      await new Promise((resolve, reject) => {
        let remaining = data[s].length;
        if (remaining === 0) return resolve();
        data[s].forEach((rec) => {
          const req = store.put(rec);
          req.onsuccess = () => { remaining -= 1; if (remaining === 0) resolve(); };
          req.onerror = () => reject(req.error);
        });
      });
    }
    return true;
  },

  async wipeAll() {
    for (const s of STORES) await idb.clear(s);
    return true;
  },

  STORES,
};

window.idb = idb;
