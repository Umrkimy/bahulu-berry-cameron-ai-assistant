import { act, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { afterEach, describe, expect, it } from "vitest";

import ActionNotifications from "./ActionNotifications";

describe("ActionNotifications", () => {
  afterEach(() => notifications.clean());

  it("renders action feedback announced to the user", async () => {
    render(<MantineProvider><ActionNotifications /></MantineProvider>);

    act(() => notifications.show({ title: "Product details saved", message: "The new price is now active.", color: "green" }));

    expect(await screen.findByText("Product details saved")).toBeVisible();
    expect(screen.getByText("The new price is now active.")).toBeVisible();
  });
});
