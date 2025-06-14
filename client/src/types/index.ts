// Re-export all types for convenient importing
export * from './game';

// Additional UI types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface NotificationState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}