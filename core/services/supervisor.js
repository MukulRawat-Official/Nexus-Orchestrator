const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const { give_best_free_model } = require("./give_best_free_model");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const apiKey = process.env.GEMINI_API_KEY;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 *  Resilient AI Supervision with Jittered Exponential Backoff
 */
async function analyzeWithRetry(taskId, errorMsg, attempt = 1) {
  try {
    // 1. Resolve the best model (2.5-flash-lite, etc.)
    const modelName = await give_best_free_model();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
        You are a Senior Site Reliability Engineer. 
        A task in our Orchestrator failed.
        Task ID: ${taskId}
        Error Message: ${errorMsg}

        Please categorize this into:
        1. RETRY (The error looks temporary)
        2. FATAL (The code or data is broken)
        3. INVESTIGATE (Unknown cause)

        Provide a 1-sentence technical explanation.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    const isRateLimit =
      e.message.includes("429") || e.message.includes("Quota");
    const isServerError =
      e.message.includes("500") || e.message.includes("503");

    // 2. RETRY LOGIC: If it's a temporary API/Network issue
    if ((isRateLimit || isServerError) && attempt <= 3) {
      // Exponential Backoff Formula: (2^attempt * 1000) + random jitter
      const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;

      console.warn(
        `  [Attempt ${attempt}] AI Throttled. Worker ${process.pid} backing off for ${Math.round(backoff)}ms...`,
      );

      await sleep(backoff);
      return analyzeWithRetry(taskId, errorMsg, attempt + 1); // Recursive Call
    }

    // 3. FATAL FALLBACK: If AI is actually down or quota is totally exhausted
    console.error(`\n Gemini API Error [Task ${taskId}]:`, e.message);
    return "AI_OFFLINE: Task moved to DLQ for manual review.";
  }
}

module.exports = { analyzeFailure: analyzeWithRetry };
