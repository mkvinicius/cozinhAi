import Anthropic from "@anthropic-ai/sdk";
import type { RunMessage } from "@cozinhai/shared";

export type ClaudeConfig = {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
};

const DEFAULT_MODEL = "claude-sonnet-4-6";

export class ClaudeAdapter {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? 8096;
  }

  async chat(messages: RunMessage[], systemPrompt?: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    const block = response.content[0];
    if (!block || block.type !== "text") throw new Error("Claude returned no text");
    return block.text;
  }

  async *stream(messages: RunMessage[], systemPrompt?: string): AsyncGenerator<string> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        yield chunk.delta.text;
      }
    }
  }
}
