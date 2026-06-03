import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Auth from "./Auth";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code && state) {
      console.log("[Index] OAuth code detected in root URL. Redirecting to callback...");
      window.location.href = `https://nglwgzknqgihlbkdnflu.supabase.co/functions/v1/email-oauth-callback?code=${code}&state=${state}`;
      return;
    }

    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return null;
};

export default Index;
