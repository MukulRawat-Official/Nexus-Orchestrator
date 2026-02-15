// core/memory_crash.js

// 1. The "Queue" is just a variable in RAM
const tasks = [];

// 2. The Producer: Pushes data into the array
function producer() {
  console.log(" Producer starting...");
  for (let i = 0; i < 10000000; i++) {
    // 1 Million
    tasks.push({
      id: i,
      data: "This is a heavy object taking up memory... " + "x".repeat(100),
    });
  }
  console.log(` Producer finished. Queue size: ${tasks.length}`);
}

// 3. The Worker: Pulls data from the array
async function worker() {
  console.log(" Worker started...");
  while (tasks.length > 0) {
    const task = tasks.shift(); // Removes from the front (O(N) operation in JS!)

    // Simulate heavy work (50ms)
    // Note: This BLOCKS the Event Loop if not careful
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (task.id % 1000 === 0) console.log(`Processed Task ${task.id}`);
  }
}

// RUN IT
// First, fill the memory (Synchronous blocking)
producer();

// Then, try to process
// worker();/
