import { notFound } from "next/navigation";
import { getItem, listCategories } from "@/lib/services/items";
import { ItemForm } from "@/components/item-form";
import { InlineAction } from "@/components/ui";
import { updateItemAction, deleteItemAction } from "../actions";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getItem(id);
  if (!item) notFound();

  return (
    <>
      <div className="header-row">
        <h1>Edit item</h1>
        <InlineAction
          action={deleteItemAction}
          id={item.id}
          label="Delete"
          className="btn danger btn-sm"
        />
      </div>
      <ItemForm action={updateItemAction} item={item} categories={listCategories()} />
    </>
  );
}
