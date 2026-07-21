import { notFound } from "next/navigation";
import { getContact } from "@/lib/services/contacts";
import { ContactForm } from "@/components/contact-form";
import { InlineAction } from "@/components/ui";
import { updateContactAction, deleteContactAction } from "../actions";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  return (
    <>
      <div className="header-row">
        <h1>Edit contact</h1>
        <InlineAction
          action={deleteContactAction}
          id={contact.id}
          label="Delete"
          className="btn danger btn-sm"
        />
      </div>
      <ContactForm action={updateContactAction} contact={contact} />
    </>
  );
}
