import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import BerryMenuEditor from "./BerryMenuEditor";
import type { MenuCopy, MenuCopyResponse } from "../../api/whatsappMenu";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";

const API = "http://localhost:8000/api/support/whatsapp-menu";

function language(prefix: string): MenuCopy["EN"] {
  return {
    menu: `${prefix} menu\n1 Products\n5 Staff`, back: `${prefix} back`, products: `${prefix} products`, sold_out: `${prefix} sold out`, no_products: `${prefix} none`,
    browse: `${prefix} see {url}`, order: `${prefix} order at {url}`, ask_order: `${prefix} order number?`, order_status: `${prefix} #{number}: {status}`,
    order_not_found: `${prefix} not found`, hours: `${prefix} {hours} {address} {map}`, handoff: `${prefix} staff soon. {hours}`, rating_ask: `${prefix} rate us`,
    rating_thanks: `${prefix} thanks {score}`, comment_thanks: `${prefix} thanks`,
    statuses: { PENDING: `${prefix} received`, PROCESSING: `${prefix} preparing`, SHIPPED: `${prefix} sent`, COMPLETED: `${prefix} done`, CANCELLED: `${prefix} cancelled` },
  };
}

const defaults: MenuCopy = { EN: language("Fictional"), MS: language("Rekaan") };
const placeholders = { menu: [], back: [], products: [], sold_out: [], no_products: [], browse: ["url"], order: ["url"], ask_order: [], order_status: ["number", "status"], order_not_found: [], hours: ["hours", "address", "map"], handoff: ["hours"], rating_ask: [], rating_thanks: ["score"], comment_thanks: [] };
const response = (current: MenuCopy, version = 1): MenuCopyResponse => ({ defaults, current, placeholders, version, updated_at: "2026-10-26T02:00:00Z" });

function renderEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithProviders(<QueryClientProvider client={client}><BerryMenuEditor /></QueryClientProvider>, "/whatsapp");
}

describe("BerryMenuEditor", () => {
  it("saves an edited menu after the owner confirms", async () => {
    let body: { expected_version: number; copy: MenuCopy } | undefined;
    server.use(
      http.get(API, () => HttpResponse.json(response(defaults))),
      http.put(API, async ({ request }) => { body = await request.json() as typeof body; return HttpResponse.json(response(body!.copy, 2)); }),
    );
    const user = userEvent.setup();
    renderEditor();

    const menu = await screen.findByRole("textbox", { name: /Main menu/ });
    await user.clear(menu);
    await user.type(menu, "New fictional greeting  ");
    expect(screen.getByLabelText("Main menu preview")).toHaveTextContent("New fictional greeting");
    await user.click(screen.getByRole("button", { name: "Save menu text" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(body?.copy.EN.menu).toBe("New fictional greeting"));
    expect(body?.expected_version).toBe(1);
    expect(body?.copy.MS).toEqual(defaults.MS);
  });

  it("resets a changed message to the default and blocks unknown placeholders", async () => {
    const current = { ...defaults, MS: { ...defaults.MS, back: "Balas * untuk kembali (rekaan)" } };
    server.use(http.get(API, () => HttpResponse.json(response(current, 3))));
    const user = userEvent.setup();
    renderEditor();

    await user.click(await screen.findByText("Bahasa Melayu"));
    const back = screen.getByRole("textbox", { name: /Back to menu line/ });
    expect(back).toHaveValue("Balas * untuk kembali (rekaan)");
    await user.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(back).toHaveValue("Rekaan back");

    const status = screen.getByRole("textbox", { name: /Order status$/ });
    await user.clear(status);
    await user.type(status, "Order {{number}");
    expect(await screen.findByText(/Keep \{status\} in this message/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save menu text" })).toBeDisabled();
  });

  it("asks the owner to reload when someone else saved first", async () => {
    server.use(
      http.get(API, () => HttpResponse.json(response(defaults))),
      http.put(API, () => HttpResponse.json({ detail: "Berry's menu text changed in another session. Reload it before saving again." }, { status: 409 })),
    );
    const user = userEvent.setup();
    renderEditor();

    const thanks = await screen.findByRole("textbox", { name: /Thanks for the comment/ });
    await user.type(thanks, " a lot");
    await user.click(screen.getByRole("button", { name: "Save menu text" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));

    expect(await screen.findByText("Changed in another session")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
