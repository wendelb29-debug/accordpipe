import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setMonitoringUser, clearMonitoringUser } from "@/lib/monitoring";

const PRIVATE_BUCKETS = ["contract-pdfs", "signatures", "user-signatures", "documents"];

function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  for (const bucket of PRIVATE_BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(url.substring(idx + marker.length).split("?")[0]);
      return { bucket, path };
    }
  }
  return null;
}

async function resolveAvatarUrl(storedUrl: string): Promise<string> {
  const parsed = parseStorageUrl(storedUrl);
  if (!parsed) return storedUrl;
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600);
  if (!error && data?.signedUrl) return data.signedUrl;
  return storedUrl;
}

export type AppRole = "admin" | "operador" | "leitura" | "ceo" | "master" | "administrativo" | "financeiro" | "comercial";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_master: boolean;
  company_id: string | null;
  avatar_url: string | null;
  signature_completed: boolean;
  created_at: string;
  updated_at: string;
  birth_date: string | null;
  theme: string;
  cpf: string | null;
  whatsapp: string | null;
  preferred_language: string;
}

interface CompanyOption {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
  cnpj: string;
  is_reseller?: boolean;
  reseller_panel_enabled?: boolean;
  servidor_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isOperador: boolean;
  isLeitura: boolean;
  isCeo: boolean;
  isMaster: boolean;
  isMasterTenantAdmin: boolean;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  companies: CompanyOption[];
  activeCompany: CompanyOption | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);

  // Prevent duplicate fetches
  const fetchingRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const isCeo = role === "ceo";
  const isMaster = profile?.is_master === true || isCeo;
  // True only for users with is_master flag (master tenant) who are CEO or Master
  const isMasterTenantAdmin = profile?.is_master === true;

  const setActiveCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (id) {
      localStorage.setItem("accord_active_company", id);
    } else {
      localStorage.removeItem("accord_active_company");
    }
  };

  useEffect(() => {
    // 1. Restore session first (synchronous-ish)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
      initializedRef.current = true;
    });

    // 2. Listen for subsequent auth changes only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip if this is the initial session restore (already handled above)
        if (!initializedRef.current) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setCompanies([]);
          setActiveCompanyIdState(null);
          setLoading(false);
          clearMonitoringUser();
          // Reset theme to light on logout
          localStorage.setItem("theme", "light");
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    // Deduplicate concurrent calls for the same user
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;

    try {
      // Fetch profile and role in parallel
      const [{ data: profileData, error: profileError }, { data: roleData, error: roleError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);

      if (profileError) throw profileError;
      if (roleError) throw roleError;

      let typedProfile = profileData as unknown as Profile | null;
      const typedRole = roleData?.role as AppRole || null;

      // Resolve avatar signed URL if stored as old public URL
      if (typedProfile?.avatar_url) {
        const resolved = await resolveAvatarUrl(typedProfile.avatar_url);
        if (resolved !== typedProfile.avatar_url) {
          typedProfile = { ...typedProfile, avatar_url: resolved };
        }
      }

      setProfile(typedProfile);
      setRole(typedRole);

      // Set monitoring context
      if (typedProfile) {
        setMonitoringUser(userId, typedProfile.email, typedProfile.company_id);
      }

      // Apply theme immediately from profile
      if (typedProfile?.theme) {
        const savedTheme = typedProfile.theme;
        localStorage.setItem("theme", savedTheme);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(savedTheme);
      }

      // Fetch companies
      const isMasterUser = typedProfile?.is_master === true;
      const isCeoUser = typedRole === "ceo";

      if (isMasterUser || isCeoUser) {
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, nome_fantasia, razao_social, cnpj, is_reseller")
          .is("servidor_id", null)
          .in("status", ["active", "teste"])
          .order("razao_social");
        setCompanies((companiesData as CompanyOption[]) || []);
      } else if (typedProfile?.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, nome_fantasia, razao_social, cnpj, is_reseller")
          .eq("id", typedProfile.company_id)
          .maybeSingle();
        if (companyData) setCompanies([companyData as CompanyOption]);
      }

      // Set active company
      const savedCompanyId = localStorage.getItem("accord_active_company");
      if (isMasterUser) {
        // True master (is_master flag) can switch tenants freely
        setActiveCompanyIdState(savedCompanyId || typedProfile?.company_id || null);
      } else if (isCeoUser && typedProfile?.company_id) {
        // CEO of a non-master tenant — always use their own company
        setActiveCompanyIdState(typedProfile.company_id);
      } else if (typedProfile?.company_id) {
        setActiveCompanyIdState(typedProfile.company_id);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      fetchingRef.current = null;
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    // Reset theme before signing out
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setCompanies([]);
    setActiveCompanyIdState(null);
    localStorage.removeItem("accord_active_company");
  };

  const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    isAdmin: role === "admin" || role === "ceo" || role === "administrativo",
    isOperador: role === "operador",
    isLeitura: role === "leitura",
    isCeo,
    isMaster,
    isMasterTenantAdmin,
    activeCompanyId,
    setActiveCompanyId,
    companies,
    activeCompany,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
