import { describe, it, expect } from "vitest";
import { classifyFarol } from "@/lib/farol/farol";

describe("classifyFarol", () => {
  it("red when saldo < 0", () => {
    expect(classifyFarol({ despesas: 1000, receitas: 500, thresholdPct: 20 }))
      .toBe("red");
  });

  it("green when saldo / receitas >= threshold", () => {
    // 800 / 1000 = 80% >= 20%
    expect(classifyFarol({ despesas: 200, receitas: 1000, thresholdPct: 20 }))
      .toBe("green");
    // boundary: exactly 20%
    expect(classifyFarol({ despesas: 800, receitas: 1000, thresholdPct: 20 }))
      .toBe("green");
  });

  it("yellow when 0 <= saldo / receitas < threshold", () => {
    // 100 / 1000 = 10% < 20%
    expect(classifyFarol({ despesas: 900, receitas: 1000, thresholdPct: 20 }))
      .toBe("yellow");
    // boundary: exactly 0%
    expect(classifyFarol({ despesas: 1000, receitas: 1000, thresholdPct: 20 }))
      .toBe("yellow");
  });

  it("zero receitas: green if saldo >= 0 and despesas == 0, else red", () => {
    expect(classifyFarol({ despesas: 0, receitas: 0, thresholdPct: 20 }))
      .toBe("green");
    expect(classifyFarol({ despesas: 100, receitas: 0, thresholdPct: 20 }))
      .toBe("red");
  });

  it("works with non-default threshold", () => {
    // 25% saldo with threshold 30 → yellow
    expect(classifyFarol({ despesas: 750, receitas: 1000, thresholdPct: 30 }))
      .toBe("yellow");
    // 25% saldo with threshold 20 → green
    expect(classifyFarol({ despesas: 750, receitas: 1000, thresholdPct: 20 }))
      .toBe("green");
  });
});
