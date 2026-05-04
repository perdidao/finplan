import { describe, it, expect } from "vitest";
import { formatBRL, parseBRL, isValidAmount } from "@/lib/money/brl";

describe("BRL formatting", () => {
  it("formats positive amounts", () => {
    expect(formatBRL("1900.00")).toBe("R$ 1.900,00");
    expect(formatBRL("115.19")).toBe("R$ 115,19");
    expect(formatBRL("0")).toBe("R$ 0,00");
  });

  it("formats negative amounts", () => {
    expect(formatBRL("-714.68")).toBe("-R$ 714,68");
  });

  it("formats null as a placeholder", () => {
    expect(formatBRL(null)).toBe("—");
  });
});

describe("BRL parsing", () => {
  it("parses Brazilian-formatted strings", () => {
    expect(parseBRL("R$ 1.900,00")).toBe("1900.00");
    expect(parseBRL("1.900,00")).toBe("1900.00");
    expect(parseBRL("115,19")).toBe("115.19");
    expect(parseBRL("0,00")).toBe("0.00");
  });

  it("parses plain decimal strings (paste-friendly)", () => {
    expect(parseBRL("1900.00")).toBe("1900.00");
    expect(parseBRL("1900")).toBe("1900.00");
  });

  it("returns null for empty / invalid input", () => {
    expect(parseBRL("")).toBe(null);
    expect(parseBRL("abc")).toBe(null);
    expect(parseBRL("R$ ")).toBe(null);
  });

  it("isValidAmount", () => {
    expect(isValidAmount("1900.00")).toBe(true);
    expect(isValidAmount("0")).toBe(true);
    expect(isValidAmount("-100.00")).toBe(true);
    expect(isValidAmount("1.5.0")).toBe(false);
    expect(isValidAmount("abc")).toBe(false);
  });
});
