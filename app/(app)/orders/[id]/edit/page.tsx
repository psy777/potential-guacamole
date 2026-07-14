import { notFound } from "next/navigation";
import { getOrder } from "@/lib/services/orders";
import { listContacts } from "@/lib/services/contacts";
import { catalogOptions } from "@/lib/services/catalog";
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
        catalog={catalogOptions()}
        order={order}
      />
    </>
  );
}
