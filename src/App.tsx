import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
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
import Atividades from "./pages/Atividades";
import Perfil from "./pages/Perfil";
import OrbitStack from "./pages/OrbitStack";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
                <ProtectedRoute allowedRoles={["admin", "operador"]}>
                  <AppLayout>
                    <Empresas />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresas/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador"]}>
                  <AppLayout>
                    <CompanyDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/boletos"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador"]}>
                  <AppLayout>
                    <Boletos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documentos"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador"]}>
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
                <ProtectedRoute allowedRoles={["admin", "operador"]}>
                  <AppLayout>
                    <Contratos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cancelamentos"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <Cancelamentos />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes/usuarios"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <Usuarios />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/atendimento"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador"]}>
                  <AppLayout>
                    <Atendimento />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/atividades"
              element={
                <ProtectedRoute allowedRoles={["admin", "operador", "ceo"]}>
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
              path="/orbit-stack"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppLayout>
                    <OrbitStack />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/assinar/:token" element={<AssinarContrato />} />
            <Route path="/captura/:servidorId" element={<CapturaLead />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
