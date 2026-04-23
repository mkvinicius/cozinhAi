import { GoogleGenAI } from "@google/genai";
import type { RunMessage } from "@cozinhai/shared";

export type GeminiConfig = {
  apiKey: string;
  model?: string;
  maxOutputTokens?: number;
};

const DEFAULT_MODEL = "gemini-2.0-flash";

export class GeminiAdapter {
  private client: GoogleGenAI;
  private model: string;
  private maxOutputTokens: number;

  constructor(config: GeminiConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxOutputTokens = config.maxOutputTokens ?? 8096;
  }

  async chat(messages: RunMessage[], systemPrompt?: string): Promise<string> {
    const history = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastMessage = history.pop();
    if (!lastMessage) throw new Error("No messages provided");

    const chat = this.client.chats.create({
      model: this.model,
      config: {
        ...(systemPrompt !== undefined ? { systemInstruction: systemPrompt } : {}),
        maxOutputTokens: this.maxOutputTokens,
      },
      history,
    });

    const response = await chat.sendMessage({
      message: lastMessage.parts[0]?.text ?? "",
    });

    return response.text ?? "";
  }

  async *stream(messages: RunMessage[], systemPrompt?: string): AsyncGenerator<string> {
    const history = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastMessage = history.pop();
    if (!lastMessage) throw new Error("No messages provided");

    const chat = this.client.chats.create({
      model: this.model,
      config: {
        ...(systemPrompt !== undefined ? { systemInstruction: systemPrompt } : {}),
        maxOutputTokens: this.maxOutputTokens,
      },
      history,
    });

    const result = await chat.sendMessageStream({
      message: lastMessage.parts[0]?.text ?? "",
    });

    for await (const chunk of result) {
      if (chunk.text) yield chunk.text;
    }
  }
}
