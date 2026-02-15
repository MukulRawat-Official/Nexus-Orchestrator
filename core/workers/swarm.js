const cluster = require("cluster");
const os = require("os");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { analyzeFailure } = require("../services/supervisor"); // Import the brain

const TOTAL_CPUS = os.cpus().length;

// Check if the key is LOADED into memory
console.log(
  `[PID: ${process.pid}] System Check: Key is ${process.env.GEMINI_API_KEY ? "LOADED" : "MISSING"}`,
);

if (cluster.isPrimary) {
  // --- MASTER PROCESS (The Manager) ---
  console.log(` Summoning a Swarm of ${TOTAL_CPUS} Workers...`);

  for (let i = 0; i < TOTAL_CPUS; i++) {
    cluster.fork();
  }

  // Resurrection Logic
  cluster.on("exit", (worker) => {
    console.log(` Worker ${worker.process.pid} died. Respawning...`);
    cluster.fork();
  });
} else {
  // --- WORKER PROCESS (The Laborer) ---
  startWorker();
}

async function startWorker() {
  const redis = require("../utils/redis_client");
  const workerId = process.pid;

  console.log(` Worker ${workerId} connected and ready.`);

  while (true) {
    let task = null;

    try {
      const result = await redis.brpop("nexus_stress_queue", 0);
      if (!result) continue;

      task = JSON.parse(result[1]); // Assign value to task

      if (task.id % 55599 === 0) {
        // MANUALLY  INSERTED POISON PILL TASK
        throw new Error("DB_DEADLOCK_EXCEPTION: Row held by process 99.");
      }

      // INCREASE REDIS SUCCESS COUNT
      await redis.incr("nexus:stats:success");

      if (Math.random() < 0.00001) {
        console.log(` Worker ${workerId} processed task ${task.id}`);
      }
    } catch (err) {
      const verdict = await analyzeFailure(task.id, err.message);
      console.log(` Gemini Verdict: ${verdict}`);

      // AI ACTION LOGIC
      if (verdict.includes("RETRY")) {
        await redis.incr("nexus:stats:retry");
        // Put it back in the main queue to try again later
        task.retry_count = (task.retry_count || 0) + 1;
        if (task.retry_count <= 3) {
          await redis.rpush("nexus_tasks", JSON.stringify(task));
          console.log(`Task ${task.id} re-queued for retry.`);
        } else {
          await redis.incr("nexus:stats:fail"); // handle stats
          await redis.lpush(
            "nexus_dlq",
            JSON.stringify({ task, ai_advice: "MAX_RETRIES_EXCEEDED" }),
          );
        }
      } else {
        // Move FATAL or INVESTIGATE to the DLQ
        await redis.lpush(
          "nexus_dlq",
          JSON.stringify({ task, ai_advice: verdict }),
        );
      }
    }
  }
}
