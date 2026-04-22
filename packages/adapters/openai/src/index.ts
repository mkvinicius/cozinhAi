import OpenAI from "openai";
import type { RunMessage } from "@cozinhai/shared";

export type OpenAIConfig = {
  apiKey: string;
  model?: string;
  maxTokens?: number;
};

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIAdapter {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? 8096;
  }

  async chat(messages: RunMessage[], systemPrompt?: string): Promise<string> {
    const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });

    for (const m of messages.filter((m) => m.role !== "system")) {
      allMessages.push({ role: m.role as "user" | "assistant", content: m.content });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: allMessages,
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("OpenAI returned no content");
    return content;
  }

  async *stream(messages: RunMessage[], systemPrompt?: string): AsyncGenerator<string> {
    const allMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });

    for (const m of messages.filter((m) => m.role !== "system")) {
      allMessages.push({ role: m.role as "user" | "assistant", content: m.content });
    }

    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: allMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta.content;
      if (delta) yield delta;
    }
  }
}
