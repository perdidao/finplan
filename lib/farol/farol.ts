export type FarolColor = "green" | "yellow" | "red";

export interface FarolInput {
  despesas: number;
  receitas: number;
  thresholdPct: number; // 0..100
}

export function classifyFarol({ despesas, receitas, thresholdPct }: FarolInput): FarolColor {
  const saldo = receitas - despesas;
  if (saldo < 0) return "red";
  if (receitas === 0) {
    // saldo >= 0 here. With no income and any expense, saldo would be < 0,
    // so reaching here implies despesas == 0 (everything zero) → green.
    return despesas === 0 ? "green" : "red";
  }
  const ratio = (saldo / receitas) * 100;
  return ratio >= thresholdPct ? "green" : "yellow";
}
