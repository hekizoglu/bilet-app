const cache = new Map();

/**
 * Get item from cache
 * @param {string} key 
 * @returns {any|null}
 */
const get = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.value;
};

/**
 * Set item in cache
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlMs Default 5 minutes
 */
const set = (key, value, ttlMs = 5 * 60 * 1000) => {
  cache.set(key, {
    value,
    expiry: Date.now() + ttlMs
  });
};

/**
 * Delete key from cache
 * @param {string} key 
 */
const del = (key) => {
  cache.delete(key);
};

/**
 * Clear the entire cache
 */
const clear = () => {
  cache.clear();
};

/**
 * Evicts all cache keys related to an eventId or general events list
 * @param {string} eventId 
 */
const clearEventCache = (eventId) => {
  for (const key of cache.keys()) {
    if (key.includes(eventId) || key === 'events' || key.startsWith('availability_')) {
      cache.delete(key);
    }
  }
};

const clearAdminReservationsCache = () => {
  for (const key of cache.keys()) {
    if (key.startsWith('admin_reservations')) {
      cache.delete(key);
    }
  }
};

module.exports = {
  get,
  set,
  del,
  clear,
  clearEventCache,
  clearAdminReservationsCache
};
