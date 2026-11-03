import React from 'react';
import { View } from 'react-native';
import { onyx } from '@/theme';
import { reportCrash } from './crash';
import { Button, T } from './ui';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/** Évite l’écran blanc : repli explicite et réessai, sans recharger toute l’app. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportCrash(error, info.componentStack ?? undefined);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: onyx.bg, padding: 24, gap: 14, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <T v="h2">Un incident a interrompu cet écran</T>
        <T muted>Vos données locales sont conservées. Vous pouvez réessayer.</T>
        <T v="small" muted>
          {error.message || 'Erreur inattendue'}
        </T>
        <Button title="Réessayer" icon="refresh" onPress={this.reset} />
      </View>
    );
  }
}
