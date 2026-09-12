import axios from "./axios";

import type { AIConfirmationPreview, AIOperationCard, ChatMessageData } from "../types/ai";

export interface AIChatRequest {
  message: string;
  conversation_id: string;
  conversation_history: ChatMessageData[];
}

export interface AIChatResponse {
  response: string;
  outcome?: ChatMessageData["outcome"];
  cards: AIOperationCard[];
  confirmation?: AIConfirmationPreview;
}

export async function confirmAIAction(conversationId: string): Promise<AIChatResponse> {
  const response = await axios.post<AIChatResponse>(
    `/ai-assistant/conversations/${conversationId}/confirmation/confirm`,
  );
  return response.data;
}

export async function cancelAIAction(conversationId: string): Promise<AIChatResponse> {
  const response = await axios.delete<AIChatResponse>(
    `/ai-assistant/conversations/${conversationId}/confirmation`,
  );
  return response.data;
}

export async function sendAIMessage(
  message: string,
  conversationId: string,
  conversationHistory: ChatMessageData[],
): Promise<AIChatResponse> {
  const response = await axios.post<AIChatResponse>("/ai-assistant/chat", {
    message,
    conversation_id: conversationId,
    conversation_history: conversationHistory,
  });

  return response.data;
}
