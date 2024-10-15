import { useEffect, useState, useCallback } from 'react';
import { Href, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useReferenceContext, useSetupContext } from '../contexts/AppContext';

export default function Index() {
  const [redirectTo, setRedirectTo] = useState<Href | null>(null);
  const { checkSetupComplete, initialLoadComplete: setupLoadComplete } = useSetupContext();
  const { checkSelectionComplete, initialLoadComplete: referenceLoadComplete } = useReferenceContext();

  const checkSetupAndSelection = useCallback(() => {
    try {
      const setupCompleted = checkSetupComplete();
      const selectionCompleted = checkSelectionComplete();

      if (!setupCompleted) {
        return '/setup';
      } else if (!selectionCompleted) {
        return '/navigation';
      } else {
        return '/recording';
      }
    } catch (error) {
      console.error(error, 'Error checking setup and selection');
      return '/setup';
    }
  }, [checkSetupComplete, checkSelectionComplete]);

  useEffect(() => {
    if (setupLoadComplete && referenceLoadComplete) {
      setRedirectTo(checkSetupAndSelection());
    }
  }, [setupLoadComplete, referenceLoadComplete, checkSetupAndSelection]);

  if (!setupLoadComplete || !referenceLoadComplete) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (redirectTo) {
    return <Redirect href={redirectTo} />;
  }

  // This should never be reached, but just in case:
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}
