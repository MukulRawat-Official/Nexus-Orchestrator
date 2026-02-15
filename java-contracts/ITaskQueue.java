package java_contracts;

import java.util.List;

/**
 * CORE CONTRACT: High-Throughput Distributed Queue
 * Designed for 10^7 scale. Rejects O(N) operations.
 */
public interface ITaskQueue {
    // FORCE BATCHING: Prevents "Death by 1 Million Requests"
    void pushBulk(List<String> tasks); 

    // ATOMIC FETCH: Prevents "Race Conditions" between workers
    List<String> popBulk(int batchSize); 

    // REAL-TIME METRICS: O(1) monitoring for the dashboard
    long getLag(); 
}