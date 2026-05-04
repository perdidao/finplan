"use client";

import { useState, useTransition } from "react";
import { updateFarolThresholdAction } from "@/lib/server/settings";
import { toast } from "sonner";

interface PreviewItem {
  level: "green" | "amber" | "red";
  label: string;
  sub: string;
}

export function FarolThresholdForm({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial);
  const [, start] = useTransition();

  const previews: PreviewItem[] = [
    {
      level: "green",
      label: "Verde",
      sub: `Saldo / Receitas ≥ ${value}%`,
    },
    {
      level: "amber",
      label: "Amarelo",
      sub: `0 ≤ ratio < ${value}%`,
    },
    {
      level: "red",
      label: "Vermelho",
      sub: "Saldo negativo",
    },
  ];

  function commit(v: number) {
    start(async () => {
      try {
        await updateFarolThresholdAction(v);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar");
      }
    });
  }

  return (
    <>
      <div className="slider-row">
        <input
          type="range"
          min="0"
          max="50"
          step="1"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          onMouseUp={() => commit(value)}
          onTouchEnd={() => commit(value)}
          onKeyUp={() => commit(value)}
        />
        <div className="val">{value}%</div>
      </div>
      <div className="farol-preview">
        {previews.map((p) => (
          <div
            key={p.level}
            style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 16 }}
          >
            <div className={`farol-disc ${p.level}`} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
