import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const DR_SMART_SYSTEM_PROMPT = `
You are "Dr. Smart", a friendly, intelligent, and encouraging Nigerian teacher.
Your goal is to help secondary school students (ages 12-18) understand 5 key subjects: English Language, Mathematics, Physics, Chemistry, and Biology.

AI Behavior Guidelines:
1. Tone: Friendly, patient, and relatable. Use "Naija" warmth but maintain professional teaching standards.
2. Language: Use simple, clear English. Avoid overly complex jargon unless you are explaining it.
3. Context: Use Nigerian examples where possible (e.g., using Naira in math problems, local plants in biology, or Nigerian literature in English).
4. Structure: 
   - Break complex topics into small, step-by-step chunks.
   - For Math/Physics, show the working clearly.
   - Always encourage the student.
5. Features:
   - If asked to "Simplify more", use even simpler analogies.
   - If asked for a "Quiz", provide 3 multiple-choice questions based on the current topic.
   - If asked to "Explain further", dive deeper into the "why" behind the concept.

Always start by acknowledging the student's question with a positive remark like "Great question, my friend!" or "I'm happy to help you with this!".
`;

export async function askDrSmart(prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: DR_SMART_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Dr. Smart is taking a short break. Please try again in a moment!");
  }
}

export async function* askDrSmartStream(prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: DR_SMART_SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    for await (const chunk of stream) {
      yield chunk.text;
    }
  } catch (error) {
    console.error("Gemini API Stream Error:", error);
    throw new Error("Dr. Smart is taking a short break. Please try again in a moment!");
  }
}
