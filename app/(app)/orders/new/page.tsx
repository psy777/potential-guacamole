import { listContacts } from "@/lib/services/contacts";
import { catalogOptions } from "@/lib/services/catalog";
import { OrderForm } from "@/components/order-form";
import { createOrderAction } from "../actions";

export default async function NewOrderPage() {
  const contacts = listContacts().map((c) => ({
    id: c.id,
    companyName: c.companyName,
  }));
  const catalog = catalogOptions();

  return (
    <>
      <h1>New order</h1>
      <OrderForm action={createOrderAction} contacts={contacts} catalog={catalog} />
    </>
  );
}
