export type AIOperationCard = {
  title: string;
  facts: string[];
  tone: "info" | "warning" | "success";
  href: string | null;
};

export type AIConfirmationPreview = {
  action_title: string;
  details: string[];
  expires_at: string;
};

export type ChatMessageData = {
  role: "user" | "assistant";
  content: string;
  cards?: AIOperationCard[];
  confirmation?: AIConfirmationPreview;
  outcome?: "ANSWER" | "CONFIRMATION_REQUIRED" | "COMPLETED" | "CANCELLED" | "FAILED";
};
