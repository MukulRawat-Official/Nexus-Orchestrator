# Nexus Orchestrator | Control Plane

Nexus Orchestrator is a high-performance, distributed task execution engine and hardware monitoring suite. It utilizes a Node.js-based worker swarm coordinated via Redis to process massive data ingestion pipelines with real-time telemetry and stateful ingestion controls.

<img width="1910" height="898" alt="image" src="https://github.com/user-attachments/assets/6eeb8615-fd9e-4c1b-8f4c-240543caa425" />


---

## Features

* **Compute Swarm:** Dynamic scaling of worker threads across multi-core systems using Node.js cluster and Redis Pub/Sub.
* **Mission Control UI:** A high-density dashboard featuring real-time hardware topology (CPU/GPU/RAM) using a fixed-height master grid.
* **Smart Ingestion:** A stateful producer pipeline that can be paused, resumed, or reset independently of the compute plane.
* **AI Rescue Operations:** Real-time monitoring of failed tasks with a dedicated counter for automated error analysis.
* **Infrastructure-as-Code:** Integrated Docker support for rapid Redis deployment and infrastructure stabilization.

---

## Architecture

The system is organized into three distinct planes to ensure modularity and fault tolerance:



1. **Control Plane (server.js):** The central nervous system. Orchestrates the UI via Socket.io and relays commands to the worker swarm.
2. **Ingestion Plane (producer.js):** High-volume data producer that batches tasks into the Redis lpush queue.
3. **Compute Plane (swarm_engine.js):** A cluster-based worker set that pulls tasks via brpop (blocking pop) for efficient, low-latency execution.

---

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Node.js (Express / Socket.io) |
| **Messaging** | Redis (Pub/Sub + List Queues) |
| **Telemetry** | SystemInformation API |
| **Frontend** | Tailwind CSS / Chart.js |
| **Containerization** | Docker Compose |

---

## Getting Started

### 1. Prerequisites
* Node.js v20.x or higher
* Redis (Local or via Docker Compose)
* pnpm or npm

### 2. Environment Setup
Create a `.env` file in the root directory:
```env```

REDIS_HOST=localhost
REDIS_PORT=6379


## Quick Start

Execute the following sequence in your terminal to initialize the database infrastructure and launch the orchestrator:

```bash
# Install project dependencies
pnpm install

# Provision Redis infrastructure (Docker required)
docker-compose up -d

# Initialize the Control Plane
node core/server.js
