import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "./axios";
import { getProducts } from "./products";

vi.mock("./axios", () => ({ default: { get: vi.fn() } }));

describe("complete admin catalogue", () => {
  beforeEach(() => vi.clearAllMocks());
  it("loads later pages so table search and sorting can reach every product", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { items: Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })), pages: 2, total: 101 } });
    vi.mocked(api.get).mockResolvedValueOnce({ data: { items: [{ id: 101 }], pages: 2, total: 101 } });
    const products = await getProducts();
    expect(products.items).toHaveLength(101);
    expect(api.get).toHaveBeenLastCalledWith("/products/admin", { params: { page: 2, page_size: 100 } });
  });
  it("does not present an incomplete catalogue when a later page fails", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { items: [{ id: 1 }], pages: 2 } });
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Unavailable"));
    await expect(getProducts()).rejects.toThrow("Unavailable");
  });
});
