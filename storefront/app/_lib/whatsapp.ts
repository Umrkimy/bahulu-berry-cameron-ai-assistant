// Set from the approved number at build time; empty hides every WhatsApp action.
export function whatsAppNumber(): string {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
}

export function whatsAppUrl(number: string, message: string): string {
  return message ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `https://wa.me/${number}`;
}

export type OrderLine = { name: string; quantity: number; total: string };

// Builds the draft message only; the customer reviews and sends it themselves.
export function orderMessage(greeting: string, lines: OrderLine[], totalLabel: string, total: string): string {
  const items = lines.map((line) => `- ${line.quantity} × ${line.name} (${line.total})`);
  return [greeting, "", ...items, "", `${totalLabel}: ${total}`].join("\n");
}
