import { listContacts } from "@/lib/services/contacts";
import { catalogGroups } from "@/lib/services/catalog";
import { getSettings } from "@/lib/services/settings";
import { peekNextInvoiceId } from "@/lib/services/orders";
import { OrderForm } from "@/components/order-form";
import { createOrderAction } from "../actions";

export default async function NewOrderPage() {
  const contacts = listContacts().map((c) => ({
    id: c.id,
    companyName: c.companyName,
  }));

  return (
    <>
      <h1>New order</h1>
      <OrderForm
        action={createOrderAction}
        contacts={contacts}
        groups={catalogGroups()}
        processingFeePercent={getSettings().processingFeePercent}
        nextInvoiceId={peekNextInvoiceId()}
      />
    </>
  );
}
