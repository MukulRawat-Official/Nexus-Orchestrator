const redis = require("../utils/redis_client");
const BATCH_SIZE = 10000;
const TOTAL_TASKS = 20e6; // 20 Million

async function pushTasks() {
  console.time("Ingestion Time");
  console.log(` Starting ingestion of ${TOTAL_TASKS} tasks...`);

  let currentId = 0;

  // Outer loop: Chunks the 20M into manageble batches
  while (currentId < TOTAL_TASKS) {
    const pipeline = redis.pipeline();

    for (let i = 0; i < BATCH_SIZE && currentId < TOTAL_TASKS; i++) {
      const taskId = `task_${currentId++}`;
      const taskPayload = JSON.stringify({
        id: taskId,
        type: Math.random() > 0.5 ? "CPU_INTENSIVE" : "API_IO",
        status: "PENDING",
        created_at: Date.now(),
      });

      // O(1) Push to the tail of the list
      pipeline.lpush("nexus_queue", taskPayload);
    }

    // Fire the batch to Redis (1 Network Request instead of 10,000)
    await pipeline.exec();

    if (currentId % (BATCH_SIZE * 10) === 0) {
      console.log(`Pushed ${currentId} / ${TOTAL_TASKS} tasks...`);
    }
  }

  console.log(" MILLION TASKS INGESTED SUCCESSFULLY");
  console.timeEnd("Ingestion Time");

  const count = await redis.llen("nexus_queue");
  console.log(` Verified Redis Count: ${count}`);

  redis.disconnect();
}

pushTasks();
