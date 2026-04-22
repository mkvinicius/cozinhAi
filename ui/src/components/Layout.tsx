import { Link, useRoute } from "wouter";
import {
  LayoutDashboard, Bot, CheckSquare, ChefHat, Building2,
  Settings, LogOut, ShoppingCart, Truck, Package, TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useLocation } from "wouter";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function NavLink({ href, label, icon: Icon }: NavItem) {
  const [active] = useRoute(href + "*");
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
          : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-3 mb-1">
        {label}
      </p>
      {children}
    </div>
  );
}

export function Layout({ children, slug }: { children: React.ReactNode; slug: string }) {
  const [, navigate] = useLocation();
  const base = `/${slug}`;

  async function handleLogout() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-gray-900 dark:text-gray-100">CozinhAI</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{slug}</p>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <NavLink href={`${base}/dashboard`} label="Dashboard" icon={LayoutDashboard} />

          <NavGroup label="CMV">
            <NavLink href={`${base}/cmv`} label="Painel CMV" icon={TrendingDown} />
            <NavLink href={`${base}/compras`} label="Compras" icon={ShoppingCart} />
            <NavLink href={`${base}/fornecedores`} label="Fornecedores" icon={Truck} />
            <NavLink href={`${base}/ingredientes`} label="Ingredientes" icon={Package} />
          </NavGroup>

          <NavGroup label="Operação">
            <NavLink href={`${base}/tarefas`} label="Tarefas" icon={CheckSquare} />
            <NavLink href={`${base}/agentes`} label="Agentes" icon={Bot} />
          </NavGroup>

          <NavGroup label="Conta">
            <NavLink href={`${base}/configuracoes`} label="Configurações" icon={Settings} />
          </NavGroup>
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-0.5">
          <Link
            href="/empresas"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <Building2 className="h-4 w-4" />
            Trocar empresa
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
