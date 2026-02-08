
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

export class GeminiService {
  private get ai(): GoogleGenAI {
    // Ensuring fresh instance for potential API key updates
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async getCodeExplanation(code: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Explain this Python code for a high school student. Use analogies and keep it encouraging:\n\n${code}`,
        config: {
          systemInstruction: "You are a friendly Python tutor. Explain logic clearly without being overly technical.",
          temperature: 0.5,
        }
      });
      return response.text || "I'm having trouble reading that code.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "I encountered an error. Please check your connection.";
    }
  }

  async getChatResponse(history: ChatMessage[], message: string): Promise<string> {
    try {
      const chatHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const chat = this.ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: chatHistory,
        config: {
          systemInstruction: "You are the TI Moodle Assistant. Help students with Python concepts. Never give full solutions; ask leading questions to guide them to the answer."
        }
      });

      const response = await chat.sendMessage({ message });
      return response.text || "Could you rephrase that?";
    } catch (error) {
      console.error("Chat Error:", error);
      return "Something went wrong in my reasoning engine.";
    }
  }

  async debugCode(code: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Review this Python code. Point out logic errors or syntax issues. Don't provide the fixed code, just explain where the logic fails:\n\n${code}`,
        config: {
          thinkingConfig: { thinkingBudget: 4000 }
        }
      });
      return response.text || "Code looks fine to me, but check your edge cases.";
    } catch (error) {
      return "Debugging service is currently unavailable.";
    }
  }
}

export const gemini = new GeminiService();
