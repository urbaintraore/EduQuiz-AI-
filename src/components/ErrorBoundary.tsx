import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Download, Trash2, Home, Sparkles, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled rendering crash:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  // Session Recovery: Download all browser local data matching 'eduquiz' or 'theme' to JSON
  private handleExportBackup = () => {
    try {
      const backupData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("eduquiz") || key === "theme")) {
          const val = localStorage.getItem(key);
          if (val) backupData[key] = val;
        }
      }

      const stringified = JSON.stringify(backupData, null, 2);
      const blob = new Blob([stringified], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eduquiz-session-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Échec de la génération du fichier de sauvegarde : " + String(err));
    }
  };

  // Session Recovery: Clear local cache & state, then hard-reload
  private handleResetCache = () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser vos données de session EduQuiz locales ? Cela effacera l'historique et déconnectera votre compte.")) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("eduquiz") || key === "theme")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  private handleTriggerReload = () => {
    try {
      localStorage.setItem("eduquiz_restore_pending", "true");
    } catch (e) {
      console.error("Could not set restore flag:", e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 antialiased font-sans flex-col" id={"error-boundary-screen"}>
          
          {/* Main Error Dashboard Card */}
          <div className="max-w-2xl w-full bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-8 space-y-6 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500"></div>

            {/* Title / Mood */}
            <div className="flex items-start space-x-4">
              <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl shrink-0">
                <AlertTriangle className="w-8 h-8 text-rose-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] bg-rose-500/10 border border-rose-500/15 text-rose-300 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">
                  Erreur de Rendu Capturée
                </span>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans mt-1">
                  Oups, quelque chose s'est mal passé !
                </h1>
                <p className="text-sm text-slate-400">
                  Un composant d'interface a rencontré une erreur inattendue. Ne vous inquiétez pas, vos données d'examen sont en sécurité.
                </p>
              </div>
            </div>

            {/* Error Message Details */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Détails techniques :</span>
              <p className="text-xs font-mono font-bold text-rose-300 break-words leading-relaxed">
                {this.state.error?.toString() || "Erreur de rendu inconnue"}
              </p>
              {this.state.errorInfo?.componentStack && (
                <div className="mt-2 text-[10px] text-slate-500 font-mono overflow-y-auto max-h-32 text-left whitespace-pre-wrap leading-normal border-t border-slate-800/50 pt-2 selection:bg-rose-500/20 selection:text-white">
                  {this.state.errorInfo.componentStack}
                </div>
              )}
            </div>

            {/* Session Recovery Widget */}
            <div className="bg-indigo-950/25 border border-indigo-500/15 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Outils de Récupération de Session</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                EduQuiz intègre un moteur de persistance local. Vous pouvez récupérer vos données pour les réimporter ou réinitialiser le cache corrompu pour stabiliser l'application.
              </p>

              {/* Action grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={this.handleExportBackup}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-700 to-indigo-650 hover:from-indigo-600 hover:to-indigo-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all duration-200"
                  title="Télécharger toute la session actuelle au format JSON"
                  id={"btn-export-backup"}
                >
                  <Download className="w-4 h-4" />
                  <span>Sauvegarder mes données (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleResetCache}
                  className="flex items-center justify-center space-x-2 bg-transparent hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 font-bold text-xs py-2.5 px-4 rounded-xl transition-all duration-200"
                  id={"btn-reset-cache"}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Effacer le cache et redémarrer</span>
                </button>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-900">
              <button
                type="button"
                onClick={this.handleTriggerReload}
                className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md transition-all duration-200 uppercase tracking-widest shrink-0 w-full sm:w-auto"
                id={"btn-reload-app"}
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>Recharger l'Application</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.hash = "/";
                }}
                className="flex items-center justify-center space-x-1.5 text-slate-400 hover:text-slate-200 text-xs font-bold py-2 px-3 hover:bg-slate-900 rounded-lg transition-all"
                id={"btn-go-to-safety"}
              >
                <Home className="w-4 h-4" />
                <span>Ignorer et forcer le retour à l'accueil</span>
              </button>
            </div>
          </div>

          {/* Little elegant footer branding */}
          <span className="text-[10px] text-slate-600 font-mono mt-4 select-none">
            Système de tolérance aux pannes EduQuiz • Récupération Active v2
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}
