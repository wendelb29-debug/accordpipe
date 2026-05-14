// Map of route href -> dynamic import for lazy-loaded pages.
// Used by the sidebar to warm up chunks on hover so navigation feels instant.
// Keep in sync with the lazy imports in src/App.tsx.
const routeImporters: Record<string, () => Promise<unknown>> = {
  "/home": () => import("@/pages/Home"),
  "/dashboard": () => import("@/pages/Dashboard"),
  "/atendimento": () => import("@/pages/Atendimento"),
  "/formularios": () => import("@/pages/Formularios"),
  "/atividades": () => import("@/pages/Atividades"),
  "/financeiro": () => import("@/pages/Financeiro"),
  "/documentos": () => import("@/pages/Documentos"),
  "/relatorios": () => import("@/pages/Relatorios"),
  "/cadastrados": () => import("@/pages/Cadastrados"),
  "/performance": () => import("@/pages/Performance"),
  "/eventos": () => import("@/pages/Eventos"),
  "/academy": () => import("@/pages/Academy"),
  "/descarte": () => import("@/pages/Descarte"),
  "/clientes": () => import("@/pages/Clientes"),
  "/empresas": () => import("@/pages/Empresas"),
  "/configuracoes/usuarios": () => import("@/pages/Usuarios"),
  "/gestao-tenants": () => import("@/pages/GestaoTenants"),
};

const warmed = new Set<string>();

export function prefetchRoute(href: string) {
  if (warmed.has(href)) return;
  const importer = routeImporters[href];
  if (!importer) return;
  warmed.add(href);
  // Fire and forget; failures are harmless (network blip, offline)
  importer().catch(() => warmed.delete(href));
}
