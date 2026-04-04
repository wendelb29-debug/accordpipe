import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "operador" | "leitura" | "ceo" | "administrativo" | "financeiro" | "comercial";

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
}

interface CompanyOption {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
  cnpj: string;
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
  // Multi-tenant
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

  const isCeo = role === "ceo";
  const isMaster = profile?.is_master === true || isCeo;

  const setActiveCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (id) {
      localStorage.setItem("accord_active_company", id);
    } else {
      localStorage.removeItem("accord_active_company");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setCompanies([]);
          setActiveCompanyIdState(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Auto sign-out when closing the browser tab for security
    const handleBeforeUnload = () => {
      // Use sendBeacon to ensure the sign-out request is sent even when the tab is closing
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = session?.access_token;
      if (accessToken && supabaseUrl) {
        navigator.sendBeacon(
          `${supabaseUrl}/auth/v1/logout`,
          new Blob(
            [JSON.stringify({})],
            { type: "application/json" }
          )
        );
      }
      // Clear local storage session data
      localStorage.removeItem("sb-nglwgzknqgihlbkdnflu-auth-token");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session?.access_token]);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData as unknown as Profile | null);

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleError) throw roleError;
      setRole(roleData?.role as AppRole || null);

      // Fetch companies for master/admin (for switcher)
      const isMasterUser = profileData?.is_master === true;
      const isAdminUser = roleData?.role === "admin";

      const isCeoUser = roleData?.role === "ceo";

      if (isMasterUser || isCeoUser) {
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, nome_fantasia, razao_social, cnpj")
          .is("servidor_id", null) // Only servidores for switcher
          .in("status", ["active", "teste"])
          .order("razao_social");
        setCompanies((companiesData as CompanyOption[]) || []);
      } else if (profileData?.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("id, nome_fantasia, razao_social, cnpj")
          .eq("id", profileData.company_id)
          .maybeSingle();
        if (companyData) setCompanies([companyData as CompanyOption]);
      }

      // Set active company
      const savedCompanyId = localStorage.getItem("accord_active_company");
      if (isMasterUser || isCeoUser) {
        setActiveCompanyIdState(savedCompanyId || null);
      } else if (profileData?.company_id) {
        setActiveCompanyIdState(profileData.company_id);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
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
    isCeo: isCeo,
    isMaster,
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
