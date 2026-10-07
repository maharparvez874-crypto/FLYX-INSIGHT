import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { FlyxInsightLogo } from './FlyxInsightLogo.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FLYX Insight Uncaught Application Exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090A0F] text-[#F5F2EB] flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#101422] border border-[#D4AF37]/30 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="flex justify-center">
              <FlyxInsightLogo size="md" />
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-xl font-bold text-white flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Interface Recovery Mode</span>
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                FLYX Insight detected an unexpected runtime condition and protected portal integrity.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/50 border border-white/10 rounded-xl font-mono text-[11px] text-amber-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message || 'Unknown runtime exception'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4 text-slate-300" />
                <span>Recover Interface</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e5c148] text-[#090A0F] text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#D4AF37]/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Portal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
