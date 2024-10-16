import ReferenceNavigation from './components/ReferenceNavigation';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react'
import { Pressable, View } from 'react-native';

export default function Navigation() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "",
          headerStyle: { backgroundColor: '#187dd9' },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerBackVisible: true,
          headerRight: () => <Pressable onPress={() => router.push('/setup')}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </Pressable>
        }}
      />
      <ReferenceNavigation onCancel={() => { router.push('/recording') }} />
    </View>
    
  )
}