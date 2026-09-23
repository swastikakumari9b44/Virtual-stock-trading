import { NavLink, Outlet } from "react-router-dom";
import { usePortfolio } from "../context/PortfolioContext";
import { inr } from "../lib/format";
import { DashboardIcon, HistoryIcon, LogoMark, MarketsIcon, PortfolioIcon } from "./icons";
import { MarketBar } from "./MarketBar";
import { Disclaimer } from "./ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: DashboardIcon, end: true },
  { to: "/markets", label: "Markets", icon: MarketsIcon },
  { to: "/portfolio", label: "Portfolio", icon: PortfolioIcon },
  { to: "/transactions", label: "Transactions", icon: HistoryIcon },
];

export function AppShell() {
  const { portfolio } = usePortfolio();
  return (
    <div className="flex min-h-screen flex-col">
      <MarketBar />
      <div className="flex flex-1">
        <aside className="sticky top-[49px] hidden h-[calc(100vh-49px)] w-60 shrink-0 flex-col border-r border-line bg-white lg:flex">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <LogoMark />
            <span className="text-[15px] font-semibold leading-tight">Virtual Stock Trading</span>
          </div>
          <nav className="flex flex-col gap-1 px-3" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-paper hover:text-ink"
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto space-y-3 border-t border-line p-5">
            <div>
              <p className="text-xs text-muted">Virtual cash available</p>
              <p className="num text-lg font-semibold">{portfolio ? inr(portfolio.cashBalance) : "…"}</p>
            </div>
            <Disclaimer />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-10">
            <Outlet />
          </main>
          <footer className="border-t border-line bg-white px-4 py-4 pb-24 lg:hidden">
            <Disclaimer />
          </footer>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white lg:hidden"
        aria-label="Main"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? "text-brand-strong" : "text-muted"}`
            }
          >
            <Icon width={22} height={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
