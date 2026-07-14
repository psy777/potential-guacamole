import { requireUser } from "@/lib/auth/session";
import { Nav } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <>
      <Nav user={user} />
      <main className="container">{children}</main>
    </>
  );
}
