import { ContactForm } from "@/components/contact-form";
import { createContactAction } from "../actions";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <h1>New contact</h1>
      {error && <div className="notice error">Company name is required.</div>}
      <ContactForm action={createContactAction} />
    </>
  );
}
