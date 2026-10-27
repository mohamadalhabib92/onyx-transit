import { Redirect } from 'expo-router';
import { store } from '@/state';

export default function Index() {
  const signedIn = store.useSelect((s) => s.signedIn);
  return <Redirect href={signedIn ? '/(tabs)' : '/welcome'} />;
}
