import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/orders";
import { getSettings } from "@/lib/services/settings";
import { renderInvoicePdf } from "@/lib/services/pdf/invoice";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const order = getOrder(id);
  if (!order) return new NextResponse("Not found", { status: 404 });

  const unpaid = order.amountPaidCents < order.totalCents;
  const payUrl = unpaid ? order.paymentLinkUrl ?? undefined : undefined;
  const pdf = await renderInvoicePdf(order, getSettings(), payUrl);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${order.number}.pdf"`,
    },
  });
}
