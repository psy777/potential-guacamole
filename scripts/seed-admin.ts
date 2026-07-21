// Create an admin user without the web UI (for headless setups).
// Usage: FIRECOAST_ADMIN_EMAIL=you@x.com FIRECOAST_ADMIN_PASSWORD=secret123 \
//        FIRECOAST_ADMIN_NAME="Owner" npm run seed:admin
import { runMigrations } from "@/lib/db/migrate";
import { userCount, createUser, getUserByEmail } from "@/lib/auth/users";

async function main() {
  await runMigrations();

  const name = process.env.FIRECOAST_ADMIN_NAME || "Owner";
  const email = process.env.FIRECOAST_ADMIN_EMAIL;
  const password = process.env.FIRECOAST_ADMIN_PASSWORD;

  if (!email || !password || password.length < 8) {
    console.error(
      "Set FIRECOAST_ADMIN_EMAIL and FIRECOAST_ADMIN_PASSWORD (8+ chars)."
    );
    process.exit(1);
  }
  if (await getUserByEmail(email)) {
    console.log(`User ${email} already exists — nothing to do.`);
    return;
  }

  await createUser({ name, email, password, role: "admin" });
  console.log(
    `Created admin ${email}. (${await userCount()} user(s) total.) You can now sign in.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
