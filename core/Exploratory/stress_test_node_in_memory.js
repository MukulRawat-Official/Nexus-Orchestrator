// core/crash_test.js
const queue = [];

// Create a "Heavy" object (1MB string)
const heavyObject = "x".repeat(1024 * 1024);

console.log(" Starting Memory Stress Test...");

try {
  let count = 0;
  while (true) {
    // Push 1MB into the array
    // In Redis, this would be on disk. Here, it's in YOUR RAM.
    queue.push({
      id: count++,
      payload: heavyObject,
      timestamp: Date.now(),
    });

    // Log memory usage every 100 items
    if (count % 100 === 0) {
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`Step ${count}: Used ${Math.round(used)} MB of RAM`);
    }
  }
} catch (e) {
  console.log(" CRASHED!");
  console.error(e);
}

/**
 *  Max limit for me Step 57595700: Used 4093 MB of RAM

<--- Last few GCs --->

[10064:0000020786E0F000]    44728 ms: Mark-Compact (reduce) 4090.8 (4094.4) -> 4090.5 (4093.6) MB, pooled: 0 MB, 2487.76 / 0.00 ms  (+ 0.0 ms in 1 steps since start of marking, biggest step 0.0 ms, walltime since start of marking 2495 ms) (average mu = 0.[10064:0000020786E0F000]    46258 ms: Mark-Compact (reduce) 4093.1 (4095.4) -> 4092.4 (4095.4) MB, pooled: 0 MB, 1192.40 / 0.00 ms  (+ 0.0 ms in 1 steps since start of marking, biggest step 0.0 ms, walltime since start of marking 1204 ms) (average mu = 0.
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

 1: 00007FF6A71BAE1F node::OnFatalError+1343
 2: 00007FF6A7E037B7 v8::Function::NewInstance+423
 3: 00007FF6A7C03E77 v8::base::AddressSpaceReservation::AddressSpaceReservation+322071
 4: 00007FF6A7C07B84 v8::base::AddressSpaceReservation::AddressSpaceReservation+337700
 5: 00007FF6A7C16B1C v8::internal::StrongRootAllocatorBase::deallocate_impl+16604
 6: 00007FF6A7C1635B v8::internal::StrongRootAllocatorBase::deallocate_impl+14619
 7: 00007FF6A907EBED v8::base::UnsignedDivisionByConstant<unsigned __int64>+2791309
 8: 00007FF6A7C01940 v8::base::AddressSpaceReservation::AddressSpaceReservation+312544
 9: 00007FF6A7C85619 v8::Unlocker::~Unlocker+9273
10: 00007FF6A77FB1C2 v8::String::Utf8Value::~Utf8Value+142210
11: 00000207BED3733A
 */
