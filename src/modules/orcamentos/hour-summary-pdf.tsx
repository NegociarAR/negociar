"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { brl } from "@/lib/format";

export interface HourSummaryPdfData {
  quoteNumber: number;
  companyName: string;
  logoUrl?: string | null;
  customerName: string;
  rateCents: number;
  entries: { entry_date: string; hours: number; description: string | null }[];
}

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 40, fontSize: 10, color: "#1c1c22", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  hLabel: { fontSize: 9, color: "#8a8a94" },
  hTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  fromTo: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#e6e6e6", borderBottomWidth: 0.5, borderBottomColor: "#e6e6e6", paddingVertical: 12, marginBottom: 16 },
  col: { flex: 1, paddingRight: 16 },
  ftLabel: { fontSize: 8, color: "#8a8a94", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  ftName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  sectionLabel: { fontSize: 8, color: "#8a8a94", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  itemDate: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  itemMeta: { fontSize: 8, color: "#8a8a94", marginTop: 2 },
  itemHours: { fontSize: 10 },
  totalsBox: { marginTop: 12, alignSelf: "flex-end", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  muted: { color: "#6b6b75" },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#1c1c22", paddingTop: 6, marginTop: 5 },
  bold: { fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: 8, color: "#9a9a9a" },
});

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export function HourSummaryPdf({ data, logoAbsUrl }: { data: HourSummaryPdfData; logoAbsUrl?: string }) {
  const totalHours = data.entries.reduce((s, e) => s + Number(e.hours), 0);
  const totalCents = Math.round(totalHours * data.rateCents);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.hLabel}>Resumo de horas</Text>
            <Text style={s.hTitle}>Orçamento #{data.quoteNumber}</Text>
          </View>
          {data.logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={data.logoUrl} style={{ maxWidth: 110, maxHeight: 44, objectFit: "contain" }} />
          ) : null}
        </View>

        <View style={s.fromTo}>
          <View style={s.col}>
            <Text style={s.ftLabel}>De</Text>
            <Text style={s.ftName}>{data.companyName}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.ftLabel}>Para</Text>
            <Text style={s.ftName}>{data.customerName}</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Horas lançadas</Text>
        {data.entries.map((e, i) => (
          <View key={i} style={s.itemRow}>
            <View>
              <Text style={s.itemDate}>{fmtDate(e.entry_date)}</Text>
              {e.description && <Text style={s.itemMeta}>{e.description}</Text>}
            </View>
            <Text style={s.itemHours}>{Number(e.hours).toFixed(2)}h</Text>
          </View>
        ))}

        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Total de horas</Text>
            <Text>{totalHours.toFixed(2)}h</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.muted}>Valor/hora</Text>
            <Text>{brl(data.rateCents)}</Text>
          </View>
          <View style={s.grand}>
            <Text style={s.bold}>Total estimado</Text>
            <Text style={s.bold}>{brl(totalCents)}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          {logoAbsUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={logoAbsUrl} style={{ height: 12, width: 12, objectFit: "contain", marginRight: 4 }} />
          ) : null}
          <Text style={s.footerText}>Feito com NEGOCIAR</Text>
        </View>
      </Page>
    </Document>
  );
}
