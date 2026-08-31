import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import { safeStorage } from "../lib/safeStorage";

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
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearAndReload = async () => {
    try {
      sessionStorage.clear();
      await safeStorage.clearAllData();
    } catch (e) {
      console.warn(e);
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isQuotaError = this.state.error?.message?.includes("quota") || this.state.error?.name === "QuotaExceededError";

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle size={28} />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {isQuotaError ? "Penyimpanan Dioptimalkan" : "Terjadi Kendala Tampilan"}
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                {isQuotaError 
                  ? "Penyimpanan browser Anda telah dialihkan ke IndexedDB / Safe Storage secara otomatis. Silakan muat ulang halaman."
                  : "Aplikasi mendeteksi kendala pada pemuatan sesi. Data Anda tetap tersimpan dengan aman."}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-100 rounded-xl text-left font-mono text-xs text-slate-700 max-h-32 overflow-y-auto border border-slate-200">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RefreshCw size={14} />
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                title="Hapus cache & muat ulang bersih jika data rusak"
              >
                <RotateCcw size={14} />
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

