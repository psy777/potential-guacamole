import { PackageForm } from "@/components/package-form";
import { listItems } from "@/lib/services/items";
import { createPackageAction } from "../actions";

export default async function NewPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const items = listItems().filter((i) => i.active);
  return (
    <>
      <h1>New package</h1>
      {error && <div className="notice error">Name is required.</div>}
      <PackageForm action={createPackageAction} items={items} />
    </>
  );
}
