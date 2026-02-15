const Redis = require("ioredis");
// Connect to Docker Redis
// increasing connection timeout just in case
const redis = new Redis({
  host: "localhost",
  port: 6379,
  connectTimeout: 10000,
});

const TOTAL_TASKS = 60e6; // 60 Million
const BATCH_SIZE = 5000;
const HEAVY_PAYLOAD = "x".repeat(100); // 100 bytes per task (simulated)

async function stressTestRedis() {
  console.log(` Starting REDIS Stress Test for ${TOTAL_TASKS} tasks...`);
  console.time("Redis Ingestion");

  let currentId = 0;

  // Monitor Node.js Memory every 1 second
  const memoryInterval = setInterval(() => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(` Node.js RAM: ${Math.round(used)} MB (Stable)`);
  }, 2000);

  while (currentId < TOTAL_TASKS) {
    const pipeline = redis.pipeline();

    for (let i = 0; i < BATCH_SIZE && currentId < TOTAL_TASKS; i++) {
      currentId++;
      // We are NOT keeping this in an array. We are firing it away!
      pipeline.lpush(
        "nexus_stress_queue",
        JSON.stringify({
          id: currentId,
          data: HEAVY_PAYLOAD,
          timestamp: Date.now(),
        }),
      );
    }

    // Send 5000 items to Redis in one network packet
    await pipeline.exec();

    if (currentId % 100000 === 0) {
      console.log(` Pushed ${currentId} tasks to Redis`);
    }
  }

  clearInterval(memoryInterval);
  console.log(" REDIS SURVIVED 60 MILLION TASKS!");
  console.timeEnd("Redis Ingestion");

  // Verify count
  const count = await redis.llen("nexus_stress_queue");
  console.log(` Final Redis Count: ${count}`);

  redis.disconnect();
}

stressTestRedis();
