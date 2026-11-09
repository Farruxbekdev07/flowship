import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function listModels() {
  try {
    const models = await ai.models.list();

    console.log("Available Gemini models:");

    for await (const model of models) {
      if (model.supportedActions?.includes("generateContent")) {
        console.log(model.name);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
