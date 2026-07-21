import { notFound } from "next/navigation";
import { getPackage } from "@/lib/services/packages";
import { listItems } from "@/lib/services/items";
import { PackageForm } from "@/components/package-form";
import { InlineAction } from "@/components/ui";
import { updatePackageAction, deletePackageAction } from "../actions";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getPackage(id);
  if (!pkg) notFound();
  const items = (await listItems()).filter((i) => i.active);

  return (
    <>
      <div className="header-row">
        <h1>Edit package</h1>
        <InlineAction
          action={deletePackageAction}
          id={pkg.id}
          label="Delete"
          className="btn danger btn-sm"
        />
      </div>
      <PackageForm action={updatePackageAction} items={items} pkg={pkg} />
    </>
  );
}
