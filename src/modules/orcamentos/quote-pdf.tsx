"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { brl } from "@/lib/format";

export interface QuotePdfData {
  number: number;
  companyName: string;
  logoUrl?: string | null;
  companyCnpj?: string | null;
  companyPhone?: string | null;
  companyCity?: string | null;
  customerName: string;
  customerCnpj?: string | null;
  customerPhone?: string | null;
  customerCity?: string | null;
  items: {
    description: string;
    quantity: number;
    unit_price_cents: number;
    total_cents: number;
  }[];
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  valid_until: string | null;
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
}

const INDIGO = "#5E6AD2";
const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 40, fontSize: 10, color: "#1c1c22", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  hLabel: { fontSize: 9, color: "#8a8a94" },
  hTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  fromTo: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#e6e6e6", borderBottomWidth: 0.5, borderBottomColor: "#e6e6e6", paddingVertical: 12, marginBottom: 16 },
  col: { flex: 1, paddingRight: 16 },
  ftLabel: { fontSize: 8, color: "#8a8a94", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  ftName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  ftLine: { fontSize: 9, color: "#6b6b75", lineHeight: 1.5, marginTop: 3 },
  sectionLabel: { fontSize: 8, color: "#8a8a94", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  itemName: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  itemMeta: { fontSize: 8, color: "#8a8a94", marginTop: 2 },
  itemTotal: { fontSize: 10 },
  totalsBox: { marginTop: 12, alignSelf: "flex-end", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  muted: { color: "#6b6b75" },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#1c1c22", paddingTop: 6, marginTop: 5 },
  bold: { fontFamily: "Helvetica-Bold" },
  condBox: { flexDirection: "row", backgroundColor: "#f4f4f6", borderRadius: 8, padding: 12, marginTop: 20 },
  condCol: { flex: 1 },
  condLabel: { fontSize: 8, color: "#8a8a94", marginBottom: 2 },
  condVal: { fontSize: 10 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontSize: 8, color: "#9a9a9a" },
});

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export function QuotePdf({ data, logoAbsUrl }: { data: QuotePdfData; logoAbsUrl?: string }) {
  const validade = fmtDate(data.valid_until);
  const companyLoc = data.companyCity ?? "";
  const customerLoc = data.customerCity ?? "";
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.hLabel}>Proposta comercial</Text>
            <Text style={s.hTitle}>Orçamento #{data.number}</Text>
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
            <Text style={s.ftLine}>
              {data.companyCnpj ? `CNPJ ${data.companyCnpj}\n` : ""}
              {data.companyPhone ? `${data.companyPhone}\n` : ""}
              {companyLoc}
            </Text>
          </View>
          <View style={s.col}>
            <Text style={s.ftLabel}>Para</Text>
            <Text style={s.ftName}>{data.customerName}</Text>
            <Text style={s.ftLine}>
              {data.customerCnpj ? `CNPJ ${data.customerCnpj}\n` : ""}
              {data.customerPhone ? `${data.customerPhone}\n` : ""}
              {customerLoc}
            </Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Itens da proposta</Text>
        {data.items.map((it, i) => (
          <View key={i} style={s.itemRow}>
            <View>
              <Text style={s.itemName}>{it.description}</Text>
              <Text style={s.itemMeta}>{it.quantity} × {brl(it.unit_price_cents)}</Text>
            </View>
            <Text style={s.itemTotal}>{brl(it.total_cents)}</Text>
          </View>
        ))}

        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{brl(data.subtotal_cents)}</Text>
          </View>
          {data.discount_cents > 0 && (
            <View style={s.totalRow}>
              <Text style={s.muted}>Desconto</Text>
              <Text>- {brl(data.discount_cents)}</Text>
            </View>
          )}
          <View style={s.grand}>
            <Text style={s.bold}>Total</Text>
            <Text style={s.bold}>{brl(data.total_cents)}</Text>
          </View>
        </View>

        {(validade || data.payment_terms || data.delivery_terms) && (
          <View style={s.condBox}>
            {validade && (
              <View style={s.condCol}>
                <Text style={s.condLabel}>Validade</Text>
                <Text style={s.condVal}>{validade}</Text>
              </View>
            )}
            {data.payment_terms && (
              <View style={s.condCol}>
                <Text style={s.condLabel}>Pagamento</Text>
                <Text style={s.condVal}>{data.payment_terms}</Text>
              </View>
            )}
            {data.delivery_terms && (
              <View style={s.condCol}>
                <Text style={s.condLabel}>Entrega</Text>
                <Text style={s.condVal}>{data.delivery_terms}</Text>
              </View>
            )}
          </View>
        )}

        {data.notes ? (
          <Text style={{ fontSize: 9, color: "#6b6b75", marginTop: 12 }}>{data.notes}</Text>
        ) : null}

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
