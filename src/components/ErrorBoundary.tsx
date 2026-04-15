import { Component, ErrorInfo, ReactNode } from "react";
import { captureAppError } from "@/lib/monitoring";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackModule?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureAppError(error, {
      module: this.props.fallbackModule || "react",
      action: "error_boundary",
      metadata: { componentStack: errorInfo.componentStack?.substring(0, 1000) },
    }, "critical");
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Algo deu errado
          </h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Ocorreu um erro inesperado. Nossa equipe já foi notificada. 
            Tente novamente ou recarregue a página.
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={this.handleRetry}>
              Tentar novamente
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
