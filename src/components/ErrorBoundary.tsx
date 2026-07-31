import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ComponentClass: any = React.Component;

export class ErrorBoundary extends ComponentClass {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  private handleResetState = () => {
    try {
      localStorage.removeItem('foto_studio_pending_shared_import');
    } catch (e) {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex items-center justify-center font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-100">Terjadi Pemulihan Sistem</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Aplikasi mengalami gangguan sementara saat memproses data share/intent.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left">
                <p className="text-[11px] font-mono text-rose-400 break-all line-clamp-3">
                  {(this.state.error as Error).message || 'Error tidak diketahui'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="py-2.5 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Muat Ulang</span>
              </button>

              <button
                onClick={this.handleResetState}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4 text-sky-400" />
                <span>Reset Sesi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
