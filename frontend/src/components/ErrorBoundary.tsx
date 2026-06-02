import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('ErrorBoundary yakaladı:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', padding: 32,
          fontFamily: 'system-ui, sans-serif', background: '#f8fafc',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 40, maxWidth: 480,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ margin: '0 0 12px', color: '#1e293b', fontSize: 20 }}>
              Beklenmeyen bir hata oluştu
            </h2>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
              {this.state.message || 'Uygulama bir hatayla karşılaştı.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#3b82f6', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 24px', fontSize: 14,
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
