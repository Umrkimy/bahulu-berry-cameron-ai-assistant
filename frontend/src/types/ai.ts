export type AIOperationCard = {
  title: string;
  facts: string[];
  tone: "info" | "warning" | "success";
  href: string | null;
};

export type ChatMessageData = {
  role: "user" | "assistant";
  content: string;
  cards?: AIOperationCard[];
  outcome?: "ANSWER" | "CONFIRMATION_REQUIRED" | "COMPLETED" | "FAILED";
};
