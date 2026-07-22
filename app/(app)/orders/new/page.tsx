import { listContacts } from "@/lib/services/contacts";
import { catalogGroups } from "@/lib/services/catalog";
import { getSettings } from "@/lib/services/settings";
import { peekNextInvoiceId } from "@/lib/services/orders";
import { allItemAddOns } from "@/lib/services/addons";
import { OrderForm } from "@/components/order-form";
import { createOrderAction } from "../actions";

export default async function NewOrderPage() {
  const contacts = (await listContacts()).map((c) => ({
    id: c.id,
    companyName: c.companyName,
  }));
  const [groups, settings, nextInvoiceId, itemAddOns] = await Promise.all([
    catalogGroups(),
    getSettings(),
    peekNextInvoiceId(),
    allItemAddOns(),
  ]);

  return (
    <>
      <h1>New order</h1>
      <OrderForm
        action={createOrderAction}
        contacts={contacts}
        groups={groups}
        itemAddOns={itemAddOns}
        processingFeePercent={settings.processingFeePercent}
        nextInvoiceId={nextInvoiceId}
      />
    </>
  );
}
