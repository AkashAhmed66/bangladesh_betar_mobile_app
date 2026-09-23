const values = new Map();
module.exports = {
  getItem: async key => values.has(key) ? values.get(key) : null,
  setItem: async (key, value) => { values.set(key, value); },
  removeItem: async key => { values.delete(key); },
  clear: async () => { values.clear(); },
  getAllKeys: async () => Array.from(values.keys()),
  multiGet: async keys => keys.map(key => [key, values.get(key) || null]),
  multiSet: async pairs => pairs.forEach(([key, value]) => values.set(key, value)),
  multiRemove: async keys => keys.forEach(key => values.delete(key)),
};
