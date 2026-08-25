import axios from "./axios";

import type { ChatMessageData } from "../types/ai";

export interface AIChatRequest {
  message: string;
  conversation_history: ChatMessageData[];
}

export interface AIChatResponse {
  response: string;
}

export async function sendAIMessage(
  message: string,
  conversationHistory: ChatMessageData[],
): Promise<string> {
  const response = await axios.post<AIChatResponse>("/ai-assistant/chat", {
    message,
    conversation_history: conversationHistory,
  });

  return response.data.response;
}
