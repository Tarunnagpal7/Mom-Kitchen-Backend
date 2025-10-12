const redisClient = require('../config/redis');

const setCache = async (key, data, expiration = 3600) => {
  try {
    await redisClient.set(key, JSON.stringify(data), { EX: expiration });
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
};

const deleteCachePattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
};

module.exports = {
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
};
