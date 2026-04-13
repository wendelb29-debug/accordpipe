import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeSync } from "@/components/layout/ThemeSync";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Empresas from "./pages/Empresas";
import CompanyDetail from "./pages/CompanyDetail";
import Boletos from "./pages/Boletos";
import Documentos from "./pages/Documentos";
import Relatorios from "./pages/Relatorios";
import Contratos from "./pages/Contratos";
import Cancelamentos from "./pages/Cancelamentos";
import Usuarios from "./pages/Usuarios";
import Atendimento from "./pages/Atendimento";
import AssinarContrato from "./pages/AssinarContrato";
import ResetPassword from "./pages/ResetPassword";
import CapturaLead from "./pages/CapturaLead";
import FormularioContato from "./pages/FormularioContato";
import Atividades from "./pages/Atividades";
import Perfil from "./pages/Perfil";
import AccordStack from "./pages/AccordStack";
import GestaoVendas from "./pages/GestaoVendas";
import NotFound from "./pages/NotFound";
import Formularios from "./pages/Formularios";
import FormPublico from "./pages/FormPublico";
import Cadastrados from "./pages/Cadastrados";
import Financeiro from "./pages/Financeiro";
import Clientes from "./pages/Clientes";
import Descarte from "./pages/Descarte";
import AssinarPdf from "./pages/AssinarPdf";
import AssinaturaOnboarding from "./pages/AssinaturaOnboarding";
import Assinaturas from "./pages/Assinaturas";
import ValidarDocumento from "./pages/ValidarDocumento";
import Servidores from "./pages/Servidores";
import NovoServidor from "./pages/NovoServidor";
import AceitarConvite from "./pages/AceitarConvite";
import AssinarDocumento from "./pages/AssinarDocumento";
import AuditLogs from "./pages/AuditLogs";
import Performance from "./pages/Performance";
import TenantSetupPublico from "./pages/TenantSetupPublico";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeSync />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
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
                    <Relatorios />
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
                    <Formularios />
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
            <Route
              path="/onboarding/assinatura"
              element={
                <ProtectedRoute>
                  <AssinaturaOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/assinaturas"
              element={
                <ProtectedRoute allowedRoles={["admin", "ceo"]}>
                  <AppLayout>
                    <Assinaturas />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
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
              path="/configuracoes/auditoria"
              element={
                <ProtectedRoute requiredPermission="view_audit_logs">
                  <AppLayout>
                    <AuditLogs />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
