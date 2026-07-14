import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listUsers } from "@/lib/auth/users";
import {
  createUserAction,
  toggleActiveAction,
  resetPasswordAction,
} from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  const current = await requireUser();
  if (current.role !== "admin") redirect("/");
  const { msg, err } = await searchParams;
  const users = listUsers();

  return (
    <>
      <h1>Users</h1>
      {msg && <div className="notice ok">{msg}</div>}
      {err && <div className="notice error">{err}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add a user</h2>
        <form action={createUserAction}>
          <div className="grid2">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required />
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="password">Temporary password (8+ chars)</label>
              <input id="password" name="password" type="text" required minLength={8} />
            </div>
            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn">Create user</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.active ? "Active" : "Disabled"}</td>
                <td>
                  <div className="actions">
                    {u.id !== current.id && (
                      <form action={toggleActiveAction} style={{ display: "inline" }}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="active" value={(!u.active).toString()} />
                        <button type="submit" className="btn ghost btn-sm">
                          {u.active ? "Disable" : "Enable"}
                        </button>
                      </form>
                    )}
                    <form action={resetPasswordAction} style={{ display: "inline-flex", gap: "0.3rem" }}>
                      <input type="hidden" name="id" value={u.id} />
                      <input name="password" type="text" placeholder="new password" style={{ width: 140 }} />
                      <button type="submit" className="btn ghost btn-sm">Reset</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
