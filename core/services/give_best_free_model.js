const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Cache the model name so we don't fetch from Google every single time
let cachedModel = null;

/**
 * Dynamic Model Discovery
 * Automatically selects the best available 'Flash' model from the Free Tier.
 */
async function give_best_free_model() {
  if (cachedModel) return cachedModel;

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await axios.get(url);

    const availableModels = response.data.models
      .filter((m) => m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));

    const preferences = [
      "gemini-2.5-flash-lite", // 1,000 RPD (Best for high-volume tasks)
      "gemini-2.5-flash", // 250 RPD (High intelligence)
      "gemini-2.0-flash", // Stable fallback
    ];

    // Find the first match based on our priority list
    cachedModel = preferences.find((model) => availableModels.includes(model));

    // Fallback safety
    if (!cachedModel) cachedModel = "gemini-2.5-flash";

    console.log(` [DISCOVERY] Best Free Model Resolved: ${cachedModel}`);
    return cachedModel;
  } catch (err) {
    console.error(" Model discovery failed. Falling back to gemini-2.5-flash.");
    return "gemini-2.5-flash";
  }
}

module.exports = { give_best_free_model };
