import Link from "next/link";
import { requireContact } from "@/lib/auth/wholesale";
import { getCart } from "@/lib/services/wholesale";
import { formatMoney } from "@/lib/money";
import {
  setQtyAction,
  removeItemAction,
  clearCartAction,
  placeOrderAction,
} from "../actions";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; skipped?: string; err?: string }>;
}) {
  const contact = await requireContact();
  const { added, skipped, err } = await searchParams;
  const cart = await getCart(contact);

  return (
    <>
      <div className="portal-hero">
        <h1>Your cart</h1>
        <p>Review quantities, then place your order. We&apos;ll confirm shipping and invoice you.</p>
      </div>

      {added && (
        <div className="notice ok">
          Added {added} item{added === "1" ? "" : "s"} to your cart
          {skipped && Number(skipped) > 0
            ? ` (${skipped} no longer available and skipped).`
            : "."}
        </div>
      )}
      {err === "empty" && <div className="notice error">Your cart is empty.</div>}

      {cart.lines.length === 0 ? (
        <div className="card ws-empty">
          <p>Your cart is empty.</p>
          <Link href="/portal/catalog" className="btn" style={{ marginTop: "0.5rem" }}>
            Browse catalog
          </Link>
        </div>
      ) : (
        <div className="card">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Unit price</th>
                <th style={{ width: "150px" }}>Qty</th>
                <th className="num">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.lines.map((l) => (
                <tr key={l.cartItemId}>
                  <td>
                    <strong>{l.itemName}</strong>
                    {l.variationName && l.variationName !== "Regular" && (
                      <span className="muted"> · {l.variationName}</span>
                    )}
                  </td>
                  <td className="num">{formatMoney(l.unitPriceCents)}</td>
                  <td>
                    <form action={setQtyAction} className="add-row">
                      <input type="hidden" name="cartItemId" value={l.cartItemId} />
                      <input
                        name="quantity"
                        type="number"
                        min={0}
                        defaultValue={l.quantity}
                        aria-label={`Quantity for ${l.itemName}`}
                      />
                      <button type="submit" className="btn btn-sm secondary">
                        Update
                      </button>
                    </form>
                  </td>
                  <td className="num">{formatMoney(l.lineTotalCents)}</td>
                  <td>
                    <form action={removeItemAction}>
                      <input type="hidden" name="cartItemId" value={l.cartItemId} />
                      <button type="submit" className="icon-btn danger" aria-label="Remove">
                        ✕
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              <tr className="ws-total-row">
                <td colSpan={3}>Subtotal ({cart.count} units)</td>
                <td className="num">{formatMoney(cart.subtotalCents)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <p className="muted small" style={{ marginTop: "0.75rem" }}>
            Shipping and any taxes are added when Comfort Cross confirms your order.
          </p>

          <div className="actions" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <form action={placeOrderAction}>
              <button type="submit" className="btn">
                Place order
              </button>
            </form>
            <form action={clearCartAction}>
              <button type="submit" className="btn secondary">
                Clear cart
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
