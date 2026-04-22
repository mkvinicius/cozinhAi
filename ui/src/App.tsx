import { Route, Switch, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Login } from "@/pages/Login";
import { Empresas } from "@/pages/Empresas";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { CmvDashboard } from "@/pages/CmvDashboard";
import { Agentes } from "@/pages/Agentes";
import { Tarefas } from "@/pages/Tarefas";
import { Layout } from "@/components/Layout";
import { authClient } from "@/lib/auth-client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [location] = useLocation();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!session && !location.startsWith("/login")) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function EmpresaRoutes({ slug }: { slug: string }) {
  return (
    <Layout slug={slug}>
      <Switch>
        <Route path="/:s/dashboard"><Dashboard slug={slug} /></Route>
        <Route path="/:s/cmv"><CmvDashboard slug={slug} /></Route>
        <Route path="/:s/agentes"><Agentes slug={slug} /></Route>
        <Route path="/:s/tarefas"><Tarefas slug={slug} /></Route>
        <Route><Redirect to={`/${slug}/dashboard`} /></Route>
      </Switch>
    </Layout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/login"><Login /></Route>
        <Route path="/onboarding">
          <AuthGuard><Onboarding /></AuthGuard>
        </Route>
        <Route path="/empresas">
          <AuthGuard><Empresas /></AuthGuard>
        </Route>
        <Route path="/:slug/*">
          {(params) => (
            <AuthGuard>
              <EmpresaRoutes slug={params.slug} />
            </AuthGuard>
          )}
        </Route>
        <Route><Redirect to="/empresas" /></Route>
      </Switch>
    </QueryClientProvider>
  );
}
