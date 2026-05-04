const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(amount: string | null): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  // Intl.NumberFormat inserts a non-breaking space (U+00A0) between R$ and the
  // number. Replace with a regular space so output is copy-paste friendly.
  return fmt.format(n).replace(/ /g, " ");
}

export function isValidAmount(s: string): boolean {
  return /^-?\d+(\.\d{1,2})?$/.test(s);
}

export function parseBRL(input: string): string | null {
  const trimmed = input.replace(/\s/g, "").replace(/^R\$/, "");
  if (trimmed === "") return null;

  // If a comma appears, treat it as decimal (BR convention) and strip dots as
  // thousands separators. Otherwise, accept dot-decimal as-is.
  let normalized: string;
  if (trimmed.includes(",")) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = trimmed;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}
