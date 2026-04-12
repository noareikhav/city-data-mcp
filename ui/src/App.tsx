import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, Component, type ReactNode, type ErrorInfo } from 'react';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { BriefingPage } from './pages/BriefingPage';
import { ChangeTrackerPage } from './pages/ChangeTrackerPage';
import { ComparePage } from './pages/ComparePage';
import { ExplorerPage } from './pages/ExplorerPage';
import { ChatPanel } from './components/chat/ChatPanel';

// Error boundary to catch and display React render errors
class ErrorBoundary extends Component<
  { children: ReactNode; name?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? ` ${this.props.name}` : ''}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, margin: 16, borderRadius: 12, background: '#1c2333', border: '1px solid #ef444440' }}>
          <h3 style={{ color: '#f87171', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {this.props.name ? `Error in ${this.props.name}` : 'Something went wrong'}
          </h3>
          <pre style={{ color: '#fca5a5', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ color: '#6b7280', fontSize: 10, marginTop: 8, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 12, padding: '4px 12px', borderRadius: 6, background: '#6366f1', color: 'white', fontSize: 12, border: 'none', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [city, setCity] = useState('Denver');

  return (
    <ErrorBoundary name="App">
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--bg-body)' }}>
          <Header city={city} onCityChange={setCity} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <ErrorBoundary name="Routes">
              <Routes>
                <Route path="/" element={
                  <ErrorBoundary name="DashboardPage">
                    <DashboardPage city={city} />
                  </ErrorBoundary>
                } />
                <Route path="/brief" element={
                  <ErrorBoundary name="BriefingPage">
                    <BriefingPage city={city} />
                  </ErrorBoundary>
                } />
                <Route path="/changes" element={
                  <ErrorBoundary name="ChangeTrackerPage">
                    <ChangeTrackerPage city={city} />
                  </ErrorBoundary>
                } />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/explorer" element={
                  <ErrorBoundary name="ExplorerPage">
                    <ExplorerPage city={city} />
                  </ErrorBoundary>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <ErrorBoundary name="ChatPanel">
            <ChatPanel city={city} />
          </ErrorBoundary>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
