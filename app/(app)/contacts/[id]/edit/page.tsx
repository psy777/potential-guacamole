import Link from "next/link";
import { notFound } from "next/navigation";
import { getContact } from "@/lib/services/contacts";
import { ContactForm } from "@/components/contact-form";
import { updateContactAction } from "../../actions";

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
        <h1>Edit {contact.companyName}</h1>
        <Link href={`/contacts/${contact.id}`} className="btn secondary btn-sm">
          Cancel
        </Link>
      </div>
      <ContactForm action={updateContactAction} contact={contact} />
    </>
  );
}
