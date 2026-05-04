import type { FarolColor } from "@/lib/farol/farol";

const css: Record<FarolColor, string> = {
  green: "green",
  yellow: "amber",
  red: "red",
};

export function FarolDisc({ color }: { color: FarolColor }) {
  return <div className={`farol-disc ${css[color]}`} aria-hidden />;
}
