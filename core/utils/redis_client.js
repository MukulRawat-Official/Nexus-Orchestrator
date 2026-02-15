const Redis = require("ioredis");

// Centralized Infrastructure Client
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on("error", (err) => console.error(" Redis Connection Error:", err));
redis.on("connect", () => console.log("Connected to Redis Shared Client"));

module.exports = redis;
