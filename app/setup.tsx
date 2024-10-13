import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';

import {styled} from "nativewind"
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useReferenceContext, useSetupContext } from '../components/AppContext';
import { predefinedSchemas, versifications } from '../constants/versifications';
import { getLanguages, Language } from '../constants/languages/languageUtils';
import { useRouter } from 'expo-router';

const StyledIonicons = styled(Ionicons);

export default function Setup() {
  const { state:setupState, setVersification, setVersificationSchema, checkSetupComplete, setLanguage } = useSetupContext();
  const { checkSelectionComplete } = useReferenceContext();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const router = useRouter();

  const [languages, setLanguages] = useState<Language[]>([]);

  useEffect(() => {
    const loadLanguages = async () => {
      setLoading(true);
      const loadedLanguages = await getLanguages();
      setLanguages(loadedLanguages);
      setLoading(false);
    };
    loadLanguages();
  }, []);

  const memoizedFilteredLanguages = useMemo(() => {
    if (!search || search.length <= 1) return languages;
    
    const lowerSearchTerm = search.toLowerCase();
    return languages
      .filter(lang =>
        lang.ln.toLowerCase().includes(lowerSearchTerm) ||
        lang.lc.toLowerCase().includes(lowerSearchTerm)
      )
      .sort((a, b) => {
        const aLnMatch = a.ln.toLowerCase().startsWith(search.toLowerCase());
        const bLnMatch = b.ln.toLowerCase().startsWith(search.toLowerCase());
        const aLcMatch = a.lc.toLowerCase().startsWith(search.toLowerCase());
        const bLcMatch = b.lc.toLowerCase().startsWith(search.toLowerCase());

        if (aLnMatch && !bLnMatch) return -1;
        if (!aLnMatch && bLnMatch) return 1;
        if (aLcMatch && !bLcMatch) return -1;
        if (!aLcMatch && bLcMatch) return 1;

        return a.ln.localeCompare(b.ln);
      });
  }, [languages, search]);

  useEffect(() => {
    loadSavedSettings();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const loadSavedSettings = async () => {
    setLoading(true);
    try {
      if (!setupState.selectedVersification) {
        setVersification("eng.json")
        loadVersificationSchema('eng.json');
      } else {
        loadVersificationSchema(setupState.selectedVersification);
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
      Alert.alert('Error', 'Failed to load saved settings. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = (language: { ln: string; lc: string }) => {
    setLanguage(language);
  };

  const handleVersificationSelect = (file: string) => {
    setVersification(file);
    loadVersificationSchema(file);
  };

  const loadVersificationSchema = (file: keyof typeof versifications) => {
    try {
      const schema = versifications[file];
      if (!schema) {
        throw new Error('Invalid versification file');
      }
      setVersificationSchema(schema);
    } catch (error) {
      console.error('Error loading versification schema:', error);
      Alert.alert('Error', 'Failed to load versification schema. Please try again.');
    }
  };

  const continueToNextScreen = () => {
    if (!setupState.selectedLanguage) {
      Alert.alert('Error', 'Please select a language before continuing');
      return;
    }

    try {
      loadVersificationSchema(setupState.selectedVersification);
      const setupComplete = checkSetupComplete();
      if (router.canGoBack()) {
        router.back();
      } else
      if (setupComplete) {
        if (checkSelectionComplete()) {
          router.replace('/recording');
        } else {
          router.replace('/navigation');
        }
      } else {
        Alert.alert('Error', 'Setup is not complete. Please try again.');
      }
    } catch (error) {
      console.error('Error during setup completion:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    }
  };

  const renderLanguageItem = useCallback(({ item }: { item: Language }) => (
    <TouchableOpacity
      className={`py-2 px-4 border-b border-gray-200 flex-row items-center`}
      onPress={() => handleLanguageSelect(item)}
    >
      <View className="flex-1 flex-row items-center">
        <MaterialCommunityIcons name="translate" size={20} color="gray" />
        <Text className="text-base ml-2">{item.ln}</Text>
        <Text className="ml-2 text-sm text-gray-500">({item.lc})</Text>
      </View>
    </TouchableOpacity>
  ), []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className="flex-1 p-4 py-14 bg-white">
        <View className="flex-row items-center mb-4">
          <MaterialCommunityIcons name="translate" size={24} color="black" />
          <View className="flex-1 ml-2 flex-row items-center border border-gray-300 rounded-md p-2">
            <Ionicons name="search" size={24} color="gray" />
            <TextInput
              className="flex-1 ml-2"
              placeholder="Search languages"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
        
        {setupState.selectedLanguage && (
          <TouchableOpacity
            className="py-2 px-4  mb-2 border-b border-gray-200 flex-row items-center bg-blue-100"
          >
            <View className="flex-1 flex-row items-center">
              <Text className="text-base">{setupState.selectedLanguage.ln}</Text>
              <Text className="ml-2 text-sm text-gray-500">({setupState.selectedLanguage.lc})</Text>
            </View>
            <StyledIonicons name="checkmark-circle" size={24} className="text-blue-500"/>
          </TouchableOpacity>
        )}

        <FlatList
          data={memoizedFilteredLanguages}
          keyExtractor={(item) => item.lc}
          renderItem={renderLanguageItem}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={21}
        />

        {!keyboardVisible && (
          <>
            <View className="mt-8">
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="book-open-variant" size={24} color="black" />
                <Text className="text-lg font-semibold ml-2">Versification</Text>
              </View>
              {predefinedSchemas.map((schema) => (
                <TouchableOpacity
                  key={schema.file}
                  className={`py-2 px-4 border-b border-gray-200 flex-row items-center ${setupState.selectedVersification === schema.file ? 'bg-blue-100' : ''}`}
                  onPress={() => handleVersificationSelect(schema.file)}
                >
                  <Text className="flex-1">{schema.name}</Text>
                  {setupState.selectedVersification === schema.file ? (
                    <StyledIonicons name="radio-button-on" size={24} className="text-blue-500" />
                  ) : (
                    <StyledIonicons name="radio-button-off" size={24} className="text-gray-500" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              className="mt-8 bg-blue-500 p-4 rounded-full self-center flex-row items-center"
              onPress={continueToNextScreen}
            >
              <Ionicons name="arrow-forward" size={24} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
