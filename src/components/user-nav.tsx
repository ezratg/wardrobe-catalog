import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/dal";

export async function UserNav() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <nav className="flex items-center gap-2">
        <Link href="/login" className="btn px-3">Log in</Link>
        <Link href="/signup" className="btn-primary">Sign up</Link>
      </nav>
    );
  }
  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      <Link href="/" className="btn px-2 sm:px-3">Closet</Link>
      <Link href="/outfits" className="btn px-2 sm:px-3">Outfits</Link>
      <Link href="/upload" className="btn-primary" aria-label="Add clothes">
        <span aria-hidden>+</span><span className="hidden sm:inline">Add clothes</span>
      </Link>
      <details className="relative">
        <summary
          className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full bg-tile text-sm font-medium"
          aria-label="Account menu"
        >
          {user.name.slice(0, 1).toUpperCase()}
        </summary>
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-lg">
          <div className="px-2 py-1.5">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
          <form action={logout}>
            <button className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-tile">Log out</button>
          </form>
        </div>
      </details>
    </nav>
  );
}
