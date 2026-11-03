"use server";

import { GoogleGenAI } from "@google/genai";
import { FreightDocumentSchema, geminiResponseSchema } from "./freightSchema";

// 1. AI qaytarishi kerak bo'lgan structured schema

// 2. Google AI SDK ni initsializatsiya qilish
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseFreightDocument(formData: FormData) {
  try {
    const file = formData.get("document") as File;
    if (!file || file.size === 0) {
      throw new Error("Fayl topilmadi yoki yuklanmishda xatolik yuz berdi.");
    }

    // Faylni AIda o'qiladigan arrayBuffer formatiga o'tkazamiz
    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    // 3. Gemini Multimodal modelga so'rov yuborish
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash", // Hujjatlar uchun juda tez va arzon model
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type, // image/jpeg, image/png yoki application/pdf
              },
            },
            {
              text: "Analyze this logistics document (CMR, Invoice, or Bill of Lading). Extract all requested fields precisely. If a field is missing, return an empty string.",
            },
          ],
        },
      ],
      config: {
        // AI javobini majburiy biz bergan Zod schemaga moslab olamiz
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema,
        temperature: 0.1, // Aniq faktik ma'lumotlar olish uchun minimal fantaziya
      },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("AI dan hech qanday ma'lumot qaytmadi.");

    // Natijani qayta tekshirib Frontendga uzatamiz
    return {
      success: true,
      data: JSON.parse(responseText),
    };
  } catch (error: any) {
    console.error("Parsing Error:", error);
    return {
      success: false,
      error: error.message || "Hujjatni o'qishda xatolik yuz berdi.",
    };
  }
}
