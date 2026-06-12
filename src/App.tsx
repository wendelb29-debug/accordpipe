import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eager — critical entry points
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";

// Lazy — all other routes
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Empresas = lazy(() => import("./pages/Empresas"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const Boletos = lazy(() => import("./pages/Boletos"));
const Documentos = lazy(() => import("./pages/Documentos"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Contratos = lazy(() => import("./pages/Contratos"));
const Cancelamentos = lazy(() => import("./pages/Cancelamentos"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Atendimento = lazy(() => import("./pages/Atendimento"));
const AssinarContrato = lazy(() => import("./pages/AssinarContrato"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CapturaLead = lazy(() => import("./pages/CapturaLead"));
const FormularioContato = lazy(() => import("./pages/FormularioContato"));
const Atividades = lazy(() => import("./pages/Atividades"));
const Perfil = lazy(() => import("./pages/Perfil"));
const AccordStack = lazy(() => import("./pages/AccordStack"));
const GestaoVendas = lazy(() => import("./pages/GestaoVendas"));
const CrmDashboard = lazy(() => import("./pages/CrmDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Formularios = lazy(() => import("./pages/Formularios"));
const FormPublico = lazy(() => import("./pages/FormPublico"));
const Cadastrados = lazy(() => import("./pages/Cadastrados"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Descarte = lazy(() => import("./pages/Descarte"));
const AssinarPdf = lazy(() => import("./pages/AssinarPdf"));
const ValidarDocumento = lazy(() => import("./pages/ValidarDocumento"));
const Servidores = lazy(() => import("./pages/Servidores"));
const NovoServidor = lazy(() => import("./pages/NovoServidor"));
const AceitarConvite = lazy(() => import("./pages/AceitarConvite"));
const AssinarDocumento = lazy(() => import("./pages/AssinarDocumento"));
const Performance = lazy(() => import("./pages/Performance"));
const TenantSetupPublico = lazy(() => import("./pages/TenantSetupPublico"));
const Eventos = lazy(() => import("./pages/Eventos"));
const MeusTenants = lazy(() => import("./pages/MeusTenants"));
const Academy = lazy(() => import("./pages/Academy"));
const GestaoTenants = lazy(() => import("./pages/GestaoTenants"));

const WhatsAppConnection = lazy(() => import("./pages/WhatsAppConnection"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const TrialExpired = lazy(() => import("./pages/TrialExpired"));
const AccordPulse = lazy(() => import("./pages/AccordPulse"));
const Collabs = lazy(() => import("./pages/Collabs"));
const Email = lazy(() => import("./pages/Email"));
const EmailInbox = lazy(() => import("./pages/EmailInbox"));
const Marketing = lazy(() => import("./pages/Marketing"));
const MarketingCampaignDetail = lazy(() => import("./pages/MarketingCampaignDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Cache served instantly for 30s; stays in memory for 5min after unmount.
      // Big perceived speedup when navigating back to a recently visited page.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-muted border-t-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary fallbackModule="app_root">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeSync />
          <Suspense fallback={<PageLoader />}>
          <ErrorBoundary fallbackModule="route_tree">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/trial-expired" element={<TrialExpired />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Home />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresas"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "administrativo"]}>
                  <AppLayout>
                    <Empresas />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresas/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "administrativo"]}>
                  <AppLayout>
                    <CompanyDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/boletos"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "financeiro"]}>
                  <AppLayout>
                    <Boletos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documentos"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "administrativo", "financeiro", "ceo"]}>
                  <AppLayout>
                    <Documentos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <WorkspaceProvider>
                      <Relatorios />
                    </WorkspaceProvider>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contratos"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "financeiro"]}>
                  <AppLayout>
                    <Contratos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cancelamentos"
              element={
                <ProtectedRoute allowedRoles={["admin", "financeiro"]}>
                  <AppLayout>
                    <Cancelamentos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/usuarios"
              element={
                <ProtectedRoute allowedRoles={["admin", "administrativo"]}>
                  <AppLayout>
                    <Usuarios />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/atendimento"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "administrativo", "comercial"]}>
                  <AppLayout>
                    <Atendimento />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/atividades"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "ceo", "administrativo", "comercial"]}>
                  <AppLayout>
                    <Atividades />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Perfil />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accord-stack"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <AccordStack />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestao-vendas"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <GestaoVendas />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/formularios"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "administrativo", "comercial"]}>
                  <AppLayout>
                    <WorkspaceProvider>
                      <Formularios />
                    </WorkspaceProvider>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cadastrados"
              element={
                <ProtectedRoute allowedRoles={["admin", "ceo", "administrativo"]}>
                  <AppLayout>
                    <Cadastrados />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute allowedRoles={["admin", "ceo", "financeiro"]}>
                  <AppLayout>
                    <Financeiro />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute allowedRoles={["admin", "ceo", "administrativo", "financeiro"]}>
                  <AppLayout>
                    <Clientes />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/descarte"
              element={
                <ProtectedRoute allowedRoles={["admin", "ceo"]}>
                  <AppLayout>
                    <Descarte />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accord-pulse"
              element={
                <ProtectedRoute allowedRoles={["admin", "ceo", "comercial"]}>
                  <AppLayout>
                    <AccordPulse />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/collabs"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "leitura", "ceo", "administrativo", "financeiro", "comercial"]}>
                  <AppLayout>
                    <Collabs />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/email"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "ceo", "administrativo", "comercial"]}>
                  <AppLayout>
                    <Email />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/email/:accountId"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "ceo", "administrativo", "comercial"]}>
                  <AppLayout>
                    <EmailInbox />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketing"
              element={
                <ProtectedRoute allowedRoles={["admin", "ceo"]}>
                  <AppLayout><Marketing /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketing/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "ceo"]}>
                  <AppLayout><MarketingCampaignDetail /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/assinar/:token" element={<AssinarContrato />} />
            <Route path="/assinar-pdf/:token" element={<AssinarPdf />} />
            <Route path="/assinar-documento/:token" element={<AssinarDocumento />} />
            <Route path="/validar-documento/:codigo" element={<ValidarDocumento />} />
            <Route path="/validar-documento" element={<ValidarDocumento />} />
            <Route path="/captura/:servidorId" element={<CapturaLead />} />
            <Route path="/contato" element={<FormularioContato />} />
            <Route path="/form/:formId" element={<FormPublico />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/aceitar-convite" element={<AceitarConvite />} />
            <Route path="/primeiro-acesso" element={<ProtectedRoute><PrimeiroAcesso /></ProtectedRoute>} />
            <Route
              path="/servidores"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Servidores />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/servidores/novo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <NovoServidor />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/performance"
              element={
                <ProtectedRoute requiredPermission="view_performance_module">
                  <AppLayout>
                    <Performance />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/setup-tenant/:token" element={<TenantSetupPublico />} />
            <Route
              path="/eventos"
              element={
                <ProtectedRoute requiredPermission="view_events">
                  <AppLayout>
                    <Eventos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/meus-tenants"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MeusTenants />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestao-tenants"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <GestaoTenants />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/academy"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Academy />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/whatsapp"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <WhatsAppConnection />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/termos" element={<TermsOfService />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/reembolso" element={<RefundPolicy />} />
            {/* Redirects de URLs antigas / sem subrota */}
            <Route path="/configuracoes" element={<Navigate to="/configuracoes/usuarios" replace />} />
            <Route path="/crm" element={<Navigate to="/atendimento" replace />} />
            <Route path="/automacoes" element={<Navigate to="/accord-pulse" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
