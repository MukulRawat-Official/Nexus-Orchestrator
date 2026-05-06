const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");
const { spawn, exec } = require("child_process");
const si = require("systeminformation");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const redis = require("./utils/redis_client");

// Global State Variables
const publisher = redis.duplicate();
let isProducerRunning = false;
let isEngineRunning = false;
let engineProcess = null;

app.use(express.static(path.join(__dirname, "../dashboard")));

const sendLog = (msg, type = "info") => {
  const timestamp = new Date().toLocaleTimeString();
  const color =
    type === "error" ? "rose" : type === "success" ? "emerald" : "cyan";
  io.emit(
    "terminal_log",
    `<span class="text-zinc-500">[${timestamp}]</span> <span class="text-${color}-400 font-bold">${msg}</span>`,
  );
};

// Telemetry Loop
setInterval(async () => {
  try {
    const [load, mem, graphics] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.graphics(),
    ]);
    const gpuVal =
      graphics.controllers && graphics.controllers.length > 0
        ? graphics.controllers[0].utilizationGpu || 0
        : 0;

    io.emit("hardware_metrics_update", {
      cpuCores: load.cpus.map((c) => Math.round(c.load)),
      mem: Math.round((mem.active / mem.total) * 100),
      gpu: gpuVal,
    });
  } catch (e) {}
}, 2000);

// Metrics Broadcast
setInterval(async () => {
  try {
    const workers = parseInt((await redis.get("nexus:swarm:current")) || 0);
    const prodPaused =
      (await redis.get("nexus:producer:pause_flag")) === "true";
    const retries = parseInt((await redis.get("nexus:stats:retry")) || 0);

    io.emit("system_metrics_update", {
      meta: {
        systemStatus:
          workers > 0
            ? "Swarm Active"
            : isEngineRunning
              ? "Engine Online"
              : "Standby",
        producerPaused: prodPaused,
      },
      counters: {
        success: parseInt((await redis.get("nexus:stats:success")) || 0),
        queueSize: (await redis.llen("nexus_queue")) || 0,
        retries: retries,
      },
      swarm: { current: workers, max: require("os").cpus().length },
    });
  } catch (e) {}
}, 1000);

io.on("connection", (socket) => {
  socket.on("start_docker", () => {
    exec(
      "docker-compose up -d",
      { cwd: path.join(__dirname, "../") },
      (err) => {
        if (err)
          return sendLog(`Infrastructure Error: ${err.message}`, "error");
        sendLog("Redis Infrastructure Online", "success");
      },
    );
  });

  socket.on("start_producer", async () => {
    if (isProducerRunning) return;
    await redis.set("nexus:producer:pause_flag", "false");
    isProducerRunning = true;
    const p = spawn("node", [path.join(__dirname, "workers/producer.js")]);
    p.stdout.on("data", (d) =>
      sendLog(`[PRODUCER] ${d.toString().trim()}`, "info"),
    );
    p.on("close", () => (isProducerRunning = false));
  });

  socket.on("toggle_producer_pause", async () => {
    const current = await redis.get("nexus:producer:pause_flag");
    const newState = current === "true" ? "false" : "true";
    await redis.set("nexus:producer:pause_flag", newState);
    sendLog(
      `Ingestion Pipeline ${newState === "true" ? "PAUSED" : "RESUMED"}`,
      newState === "true" ? "error" : "success",
    );
  });

  socket.on("start_swarm_engine", () => {
    if (isEngineRunning) return;
    isEngineRunning = true;
    engineProcess = spawn("node", [
      path.join(__dirname, "workers/swarm_engine.js"),
    ]);
    engineProcess.stdout.on("data", (d) =>
      sendLog(`[ENGINE] ${d.toString().trim()}`, "success"),
    );
    engineProcess.on("close", () => {
      isEngineRunning = false;
      engineProcess = null;
    });
  });

  socket.on("spawn_worker", () => publisher.publish("nexus_control", "spawn"));
  socket.on("kill_worker", () => publisher.publish("nexus_control", "kill"));

  socket.on("system_reset", async () => {
    publisher.publish("nexus_control", "reset");
    await redis.flushdb();
    sendLog("Global Reset Executed", "error");
  });
});

http.listen(3000, () =>
  console.log("NEXUS_CONTROL LIVE :: http://localhost:3000"),
);
