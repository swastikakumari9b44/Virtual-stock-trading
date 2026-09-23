import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md rounded-xl border border-line bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">The page hit an unexpected error</h1>
          <p className="mt-2 text-sm text-muted">Your virtual portfolio is safe on the server. Reload to continue.</p>
          <button className="btn-primary mt-4" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
