import { ItemForm } from "@/components/item-form";
import { createItemAction } from "../actions";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <h1>New item</h1>
      {error && <div className="notice error">Name is required.</div>}
      <ItemForm action={createItemAction} />
    </>
  );
}
