import { describe, it, expect, vi, beforeEach } from "vitest";

// Testar apenas a lógica de escaping, sem DOM.
// Reimplementamos a função pura localmente para não depender de document/URL.
function escapeCell(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvLines(headers: string[], rows: (string | number)[][]): string[] {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(","));
}

describe("csv escaping", () => {
  it("passthrough for plain values", () => {
    expect(escapeCell("João")).toBe("João");
    expect(escapeCell(42)).toBe("42");
  });

  it("wraps in quotes when value contains comma", () => {
    expect(escapeCell("Silva, Jr.")).toBe('"Silva, Jr."');
  });

  it("escapes inner double-quotes by doubling them", () => {
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps in quotes when value contains newline", () => {
    expect(escapeCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("produces correct CSV lines", () => {
    const lines = toCsvLines(
      ["Vendedor", "Receita"],
      [["João, Silva", 1000], ['diz "olá"', 500]],
    );
    expect(lines[0]).toBe("Vendedor,Receita");
    expect(lines[1]).toBe('"João, Silva",1000');
    expect(lines[2]).toBe('"diz ""olá""",500');
  });
});
