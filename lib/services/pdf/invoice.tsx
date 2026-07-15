import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";
import { formatMoney } from "@/lib/money";
import type { FullOrder } from "@/lib/services/orders";
import type { Settings } from "@/lib/db/schema";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  businessName: { fontSize: 20, fontWeight: "bold" },
  muted: { color: "#666" },
  title: { fontSize: 16, fontWeight: "bold", textAlign: "right" },
  section: { marginBottom: 16 },
  label: { fontSize: 8, color: "#888", textTransform: "uppercase", marginBottom: 2 },
  row: { flexDirection: "row" },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginTop: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totals: { marginTop: 12, marginLeft: "auto", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#333",
    fontSize: 12,
    fontWeight: "bold",
  },
  paidStamp: {
    marginTop: 24,
    padding: 8,
    borderWidth: 2,
    borderColor: "#2e7d32",
    color: "#2e7d32",
    fontSize: 14,
    fontWeight: "bold",
    alignSelf: "flex-start",
  },
  paySection: { marginTop: 24, padding: 12, backgroundColor: "#f5f6f8", borderRadius: 6 },
  payLink: { color: "#1d6fb8", fontSize: 10, marginTop: 4 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", color: "#999", fontSize: 8 },
  invoiceTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 12 },
  lineSub: { color: "#555", fontSize: 9, marginTop: 1 },
  lineNote: { color: "#888", fontSize: 8, fontStyle: "italic", marginTop: 1 },
  messageBox: { marginTop: 20, padding: 10, backgroundColor: "#f5f6f8", borderRadius: 4, fontSize: 10 },
});

function InvoiceDoc({
  order,
  settings,
  payUrl,
}: {
  order: FullOrder;
  settings: Settings;
  payUrl?: string;
}) {
  const c = order.contact;
  const fullyPaid = order.totalCents > 0 && order.amountPaidCents >= order.totalCents;
  const brand = settings.brandColor || "#c0392b";
  return (
    <Document title={`Invoice ${order.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.businessName, { color: brand }]}>
              {settings.businessName}
            </Text>
            {settings.businessAddress ? (
              <Text style={styles.muted}>{settings.businessAddress}</Text>
            ) : null}
            {settings.businessEmail ? (
              <Text style={styles.muted}>{settings.businessEmail}</Text>
            ) : null}
            {settings.businessPhone ? (
              <Text style={styles.muted}>{settings.businessPhone}</Text>
            ) : null}
          </View>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            {order.invoiceId ? (
              <Text style={{ textAlign: "right" }}>#{order.invoiceId}</Text>
            ) : null}
            <Text style={[styles.muted, { textAlign: "right" }]}>{order.number}</Text>
            <Text style={[styles.muted, { textAlign: "right" }]}>
              {new Date(order.createdAt).toLocaleDateString("en-US")}
            </Text>
          </View>
        </View>

        {order.title ? <Text style={styles.invoiceTitle}>{order.title}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.label}>Bill To</Text>
          <Text>{c?.companyName ?? "—"}</Text>
          {c?.contactName ? <Text>{c.contactName}</Text> : null}
          {c?.billingAddress ? (
            <Text style={styles.muted}>
              {c.billingAddress}, {c.billingCity} {c.billingState} {c.billingZip}
            </Text>
          ) : null}
          {c?.email ? <Text style={styles.muted}>{c.email}</Text> : null}
        </View>

        <View style={styles.tableHead}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colUnit}>Unit</Text>
          <Text style={styles.colTotal}>Amount</Text>
        </View>
        {order.lines.map((l) => (
          <View style={styles.tableRow} key={l.id}>
            <View style={styles.colDesc}>
              <Text>{l.description}</Text>
              {l.variationName ? <Text style={styles.lineSub}>{l.variationName}</Text> : null}
              {l.note ? <Text style={styles.lineNote}>{l.note}</Text> : null}
            </View>
            <Text style={styles.colQty}>{l.quantity}</Text>
            <Text style={styles.colUnit}>
              {formatMoney(l.unitPriceCents, order.currency)}
            </Text>
            <Text style={styles.colTotal}>
              {formatMoney(l.lineTotalCents, order.currency)}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatMoney(order.subtotalCents, order.currency)}</Text>
          </View>
          {order.discountCents > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>-{formatMoney(order.discountCents, order.currency)}</Text>
            </View>
          )}
          {order.taxCents > 0 && (
            <View style={styles.totalRow}>
              <Text>Tax</Text>
              <Text>{formatMoney(order.taxCents, order.currency)}</Text>
            </View>
          )}
          {order.shippingCents > 0 && (
            <View style={styles.totalRow}>
              <Text>Shipping</Text>
              <Text>{formatMoney(order.shippingCents, order.currency)}</Text>
            </View>
          )}
          {order.processingFeeCents > 0 && (
            <View style={styles.totalRow}>
              <Text>Card processing fee</Text>
              <Text>{formatMoney(order.processingFeeCents, order.currency)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text>{formatMoney(order.totalCents, order.currency)}</Text>
          </View>
          {order.amountPaidCents > 0 && !fullyPaid && (
            <>
              <View style={styles.totalRow}>
                <Text>Paid</Text>
                <Text>-{formatMoney(order.amountPaidCents, order.currency)}</Text>
              </View>
              <View style={styles.grandTotal}>
                <Text>Balance due</Text>
                <Text>{formatMoney(order.totalCents - order.amountPaidCents, order.currency)}</Text>
              </View>
            </>
          )}
        </View>

        {fullyPaid && <Text style={styles.paidStamp}>PAID IN FULL</Text>}

        {!fullyPaid && payUrl && (
          <View style={styles.paySection}>
            <Text style={{ fontWeight: "bold" }}>Pay this invoice online</Text>
            <Link src={payUrl} style={styles.payLink}>
              {payUrl}
            </Link>
          </View>
        )}

        {order.invoiceMessage ? (
          <View style={styles.messageBox}>
            <Text>{order.invoiceMessage}</Text>
          </View>
        ) : null}

        {settings.invoiceFooter ? (
          <Text style={styles.footer}>{settings.invoiceFooter}</Text>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(
  order: FullOrder,
  settings: Settings,
  payUrl?: string
): Promise<Buffer> {
  return renderToBuffer(
    <InvoiceDoc order={order} settings={settings} payUrl={payUrl} />
  );
}
