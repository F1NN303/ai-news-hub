import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';

export default function Header() {
  const { user } = useUser();
  return (
    <header className="sticky top-0 bg-white/80 dark:bg-dark/80 py-4 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mr-3">
            <i className="fa-solid fa-brain text-white text-lg" />
          </span>
          <span className="text-2xl font-bold bg-clip-text text-transparent gradient-bg">AI News Hub</span>
        </Link>
        {user ? (
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Dashboard</Link>
            <a href="/api/auth/logout" className="px-4 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Sign out</a>
          </nav>
        ) : (
          <nav className="flex items-center gap-4">
            <a href="/api/auth/login" className="px-4 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Sign in</a>
            <a href="/api/auth/login" className="px-4 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800">Sign up</a>
          </nav>
        )}
      </div>
    </header>
  );
}
