export interface LlmCompletionRequest {
  prompt: string;
  responseSchema: unknown;
  signal?: AbortSignal;
}

export interface LlmCompletionResponse {
  text: string;
}

export interface LlmClient {
  readonly modelName: string;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}
