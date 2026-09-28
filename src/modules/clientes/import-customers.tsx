"use client";

import { useToast } from "@/components/toast";
import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { importParsedCustomers } from "./actions";
import { parseCustomerRows, type ParseResult } from "./import-parser";
import { Button } from "@/components/ui/form";

export function ImportCustomers() {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  // baixa uma planilha-modelo com os cabeçalhos e uma linha de exemplo
  function downloadTemplate() {
    const data = [
      ["Nome", "Tipo", "CPF/CNPJ", "Telefone", "WhatsApp", "Email", "Cidade", "Estado"],
      ["João da Silva", "PF", "111.444.777-35", "47999990000", "47999990000", "joao@email.com", "Blumenau", "SC"],
      ["Empresa ABC Ltda", "PJ", "11.222.333/0001-81", "4733334444", "", "contato@abc.com", "Joinville", "SC"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "modelo-clientes.xlsx");
  }

  // lê xlsx ou csv e parseia
  async function onFile(file: File) {
    setResult(null);
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
    setParsed(parseCustomerRows(rows));
  }

  function confirmImport() {
    if (!parsed || parsed.valid.length === 0) return;
    startTransition(async () => {
      const res = await importParsedCustomers(parsed.valid);
      if (res.ok) {
        setResult(`${res.imported} cliente(s) importado(s) com sucesso.`);
        toast(`${res.imported} cliente(s) importado(s) com sucesso.`);
        setParsed(null);
        setFileName("");
      } else {
        setResult("Não foi possível importar.");
        toast("Não foi possível importar.", "error");
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Importar
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Importar clientes</h2>
          <p className="text-sm text-muted">
            Envie uma planilha Excel (.xlsx) ou CSV com os dados dos clientes.
          </p>
        </div>
        <button
          onClick={() => { setOpen(false); setParsed(null); setResult(null); }}
          className="text-sm text-muted hover:text-foreground"
        >
          Fechar
        </button>
      </div>

      <button
        onClick={downloadTemplate}
        className="text-sm font-medium text-primary hover:underline"
      >
        Baixar planilha-modelo
      </button>

      <div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:bg-subtle file:px-3 file:py-1.5 file:text-sm"
        />
        {fileName && <p className="mt-1 text-xs text-muted">{fileName}</p>}
      </div>

      {/* preview / relatório */}
      {parsed && (
        <div className="space-y-2 rounded-md border bg-subtle p-3 text-sm">
          <p>
            <strong>{parsed.valid.length}</strong> cliente(s) prontos para importar
            {parsed.errors.length > 0 && (
              <>
                {" · "}
                <span className="text-danger">
                  {parsed.errors.length} ignorado(s)
                </span>
              </>
            )}
          </p>
          {parsed.errors.length > 0 && (
            <ul className="max-h-32 space-y-0.5 overflow-auto text-xs text-muted">
              {parsed.errors.map((e, i) => (
                <li key={i}>
                  {e.line > 0 ? `Linha ${e.line}: ` : ""}{e.reason}
                </li>
              ))}
            </ul>
          )}
          {parsed.valid.length > 0 && (
            <Button type="button" onClick={confirmImport} disabled={pending}>
              {pending ? "Importando..." : `Importar ${parsed.valid.length} cliente(s)`}
            </Button>
          )}
        </div>
      )}

      {result && <p className="text-sm text-success">{result}</p>}
    </div>
  );
}
