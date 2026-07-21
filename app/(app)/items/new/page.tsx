import { ItemForm } from "@/components/item-form";
import { listCategories } from "@/lib/services/items";
import { listOptionSets } from "@/lib/services/options";
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
      {error && <div className="notice error">Item name is required.</div>}
      <ItemForm action={createItemAction} categories={await listCategories()} optionSets={await listOptionSets()} />
    </>
  );
}
