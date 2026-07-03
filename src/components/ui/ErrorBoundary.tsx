import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  title?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Card variant="danger">
          <h2 className="font-semibold">{this.props.title ?? 'Ошибка на странице'}</h2>
          <p className="mt-2 text-sm">{this.state.error.message}</p>
          <button
            type="button"
            className="btn-primary mt-3 rounded-lg px-4 py-2 text-sm"
            onClick={() => this.setState({ error: null })}
          >
            Попробовать снова
          </button>
        </Card>
      );
    }
    return this.props.children;
  }
}
