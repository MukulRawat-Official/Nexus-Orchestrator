const cluster = require("cluster");
const os = require("os");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { analyzeFailure } = require("../services/supervisor");
const redis = require("../utils/redis_client");

if (cluster.isPrimary) {
  const subscriber = redis.duplicate();
  subscriber.subscribe("nexus_control");
  let desiredWorkerCount = 0;

  subscriber.on("message", (channel, message) => {
    if (message === "spawn" && desiredWorkerCount < os.cpus().length) {
      desiredWorkerCount++;
      cluster.fork();
    }
    if (message === "kill" && desiredWorkerCount > 0) {
      desiredWorkerCount--;
      const ids = Object.keys(cluster.workers);
      if (ids.length > 0) cluster.workers[ids[0]].kill();
    }
    if (message === "reset") {
      desiredWorkerCount = 0;
      for (const id in cluster.workers) cluster.workers[id].kill();
    }
  });

  setInterval(
    () => redis.set("nexus:swarm:current", Object.keys(cluster.workers).length),
    1000,
  );
} else {
  startWorker();
}

async function startWorker() {
  while (true) {
    // --- CONSUMER PAUSE CHECK ---
    const isPaused = await redis.get("nexus:swarm:pause_flag");
    if (isPaused === "true") {
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }

    try {
      const result = await redis.brpop("nexus_queue", 1);
      if (!result) continue;
      const task = JSON.parse(result[1]);

      // Simulation of task processing...
      if (task.id % 55599 === 0) throw new Error("DB_DEADLOCK");

      await redis.incr("nexus:stats:success");
    } catch (err) {
      await redis.incr("nexus:stats:retry");
      // analyzeFailure() logic here
    }
  }
}
