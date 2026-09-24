import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession, isStaff } from "@/lib/auth";
import NavbarAuth from "./NavbarAuth";

// Server Component: reads the session and renders the nav.
export default async function Navbar() {
  const supabase = createClient();
  const session = await getSession();
  const user = session.userId ? { id: session.userId } : null;
  const username = session.username;
  const staff = isStaff(session.role);

  let unread = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    unread = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-brand">Sentry</span>Hub
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link
                href="/upload"
                className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
              >
                Upload
              </Link>
              <Link href="/dashboard" className="px-1 py-1.5 text-neutral-300 hover:text-white">
                Dashboard
              </Link>
              <Link href="/notifications" className="relative px-1 py-1.5">
                Alerts
                {unread > 0 && (
                  <span className="absolute -right-2 -top-1 rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              {staff && (
                <Link href="/admin" className="px-1 py-1.5 text-amber-400 hover:text-amber-300">
                  {session.role === "admin" ? "Admin" : "Mod"}
                </Link>
              )}
              <Link href="/settings" className="px-1 py-1.5 text-neutral-300 hover:text-white">
                Settings
              </Link>
              {username && (
                <Link href={`/profile/${username}`} className="px-1 py-1.5 text-neutral-300 hover:text-white">
                  @{username}
                </Link>
              )}
              <NavbarAuth />
            </>
          ) : (
            <>
              <Link href="/login" className="px-2 py-1.5 text-neutral-300 hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
