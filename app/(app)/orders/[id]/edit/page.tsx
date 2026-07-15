import { notFound } from "next/navigation";
import { getOrder } from "@/lib/services/orders";
import { listContacts } from "@/lib/services/contacts";
import { catalogGroups } from "@/lib/services/catalog";
import { getSettings } from "@/lib/services/settings";
import { OrderForm } from "@/components/order-form";
import { updateOrderAction } from "../../actions";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) notFound();

  const contacts = listContacts().map((c) => ({
    id: c.id,
    companyName: c.companyName,
  }));

  return (
    <>
      <h1>Edit {order.number}</h1>
      <OrderForm
        action={updateOrderAction}
        contacts={contacts}
        groups={catalogGroups()}
        order={order}
        processingFeePercent={getSettings().processingFeePercent}
      />
    </>
  );
}
