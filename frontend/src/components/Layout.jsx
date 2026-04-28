import { Link, NavLink } from "react-router-dom";
import { CarFront, CalendarDays, LogOut, Plane, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/break-planner", label: "Break Planner", icon: CalendarDays },
  { to: "/flights", label: "Flights", icon: Plane },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/rides", label: "Airport Rides", icon: CarFront }
];

export function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-hero-glow text-ink">
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-ink px-3 py-2 text-sm font-semibold text-white shadow-panel">
              UniFly
            </div>
            <div className="hidden text-sm text-slate-600 md:block">
              Plan flights home around your college breaks.
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 lg:flex">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            {user ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                <LogOut size={16} />
                Logout
              </button>
            ) : (
              <Link
                to="/auth"
                className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Login / Signup
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl overflow-visible px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      <footer className="border-t border-white/50 bg-white/60 px-4 py-6 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="font-semibold text-ink">UniFly</span> keeps flight planning first and airport rides optional.
          </div>
          <div>Built for college students planning trips around academic breaks.</div>
        </div>
      </footer>

      <nav className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between rounded-full border border-white/60 bg-white/90 px-4 py-3 shadow-panel backdrop-blur lg:hidden">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
                isActive ? "text-ink" : "text-slate-500"
              }`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
