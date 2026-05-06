const redis = require("../utils/redis_client");
const BATCH_SIZE = 10000;
const TOTAL_TASKS = 20e6;

async function pushTasks() {
  let currentId = 0;
  while (currentId < TOTAL_TASKS) {
    // PRODUCER PAUSE CHECK
    const isPaused = await redis.get("nexus:producer:pause_flag");
    if (isPaused === "true") {
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }

    const pipeline = redis.pipeline();
    for (let i = 0; i < BATCH_SIZE && currentId < TOTAL_TASKS; i++) {
      pipeline.lpush(
        "nexus_queue",
        JSON.stringify({ id: currentId++, type: "TASK" }),
      );
    }
    await pipeline.exec();

    if (currentId % 100000 === 0) {
      console.log(
        `Pushed ${currentId.toLocaleString()} / ${TOTAL_TASKS.toLocaleString()} tasks`,
      );
    }
  }
}

pushTasks();
