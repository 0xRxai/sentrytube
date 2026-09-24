import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, isStaff, isAdmin } from "@/lib/auth";

// Staff-only area. Moderators see Moderation + Analytics; admins also see
// Users and Ads. Page-level checks enforce the admin-only pages too.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  if (!isStaff(session.role)) redirect("/");

  const admin = isAdmin(session.role);

  const links = [
    { href: "/admin", label: "Moderation", show: true },
    { href: "/admin/analytics", label: "Analytics", show: true },
    { href: "/admin/users", label: "Users & roles", show: admin },
    { href: "/admin/ads", label: "Ads", show: admin },
  ].filter((l) => l.show);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4 border-b border-neutral-800 pb-3">
        <span className="text-sm font-semibold text-amber-400">
          {admin ? "Admin" : "Moderator"}
        </span>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-300 hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
