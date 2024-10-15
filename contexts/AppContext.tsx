import React, { createContext, useContext, useReducer, Dispatch } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useCallback, useMemo } from 'react';
import { versifications } from '../constants/versifications';

interface Language {
  ln: string;
  lc: string;
}

interface VersificationSchema {
  maxVerses: {
    [book: string]: number[];
  };
  excludedVerses?: string[];
  mappedVerses?: {
    [range: string]: string;
  };
  mergedVerses?: string[];
}

interface ReferenceState {
  selectedBook: string | null;
  selectedChapter: number | null;
  verseRange: [number, number] | null;
  initialLoadComplete: boolean; // New state
}

type ReferenceAction =
  | { type: 'SET_SELECTED_BOOK'; payload: string | null }
  | { type: 'SET_SELECTED_CHAPTER'; payload: number | null }
  | { type: 'SET_VERSE_RANGE'; payload: [number, number] | null }
  | { type: 'EXPAND_VERSE_RANGE'; payload: number }
  | { type: 'SHRINK_VERSE_RANGE'; payload: number }
  | { type: 'SET_INITIAL_LOAD_COMPLETE'; payload: boolean };

interface SetupState {
  selectedLanguage: Language | null;
  selectedVersification: string;
  versificationSchema: VersificationSchema | null;
  initialLoadComplete: boolean; // New state
}

type SetupAction =
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'SET_VERSIFICATION'; payload: string }
  | { type: 'SET_VERSIFICATION_SCHEMA'; payload: VersificationSchema }
  | { type: 'SET_INITIAL_LOAD_COMPLETE'; payload: boolean };

const initialSetupState: SetupState = {
  selectedLanguage: null,
  selectedVersification: 'eng.json',
  versificationSchema: null,
  initialLoadComplete: false, // Initialize to false
};

const initialReferenceState: ReferenceState = {
  selectedBook: null,
  selectedChapter: null,
  verseRange: null,
  initialLoadComplete: false, // Add this to ReferenceState
}

const SetupContext = createContext<{state: SetupState, dispatch: Dispatch<SetupAction>} | undefined>(undefined);
const ReferenceContext = createContext<{state: ReferenceState, dispatch: Dispatch<ReferenceAction>} | undefined>(undefined);

function setupReducer(state: SetupState, action: SetupAction): SetupState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, selectedLanguage: action.payload };
    case 'SET_VERSIFICATION':
      return { ...state, selectedVersification: action.payload };
    case 'SET_VERSIFICATION_SCHEMA':
      return { ...state, versificationSchema: action.payload };
    case 'SET_INITIAL_LOAD_COMPLETE':
      return { ...state, initialLoadComplete: action.payload };
    default:
      return state;
  }
}

function referenceReducer(state: ReferenceState, action: ReferenceAction): ReferenceState {
  switch (action.type) {
    case 'SET_SELECTED_BOOK':
      return { ...state, selectedBook: action.payload };
    case 'SET_SELECTED_CHAPTER':
      return { ...state, selectedChapter: action.payload };
    case 'SET_VERSE_RANGE':
      return { ...state, verseRange: action.payload };
    case 'SET_INITIAL_LOAD_COMPLETE':
      return { ...state, initialLoadComplete: action.payload };
    default:
      return state;
  }
}

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [setupState, setupDispatch] = useReducer(setupReducer, initialSetupState);

  const persistentSetupDispatch = useCallback((action: SetupAction) => {
    setupDispatch(action);
    switch (action.type) {
      case 'SET_LANGUAGE':
        AsyncStorage.setItem('selectedLanguage', JSON.stringify(action.payload));
        break;
      case 'SET_VERSIFICATION':
        AsyncStorage.setItem('selectedVersification', action.payload);
        break;
      case 'SET_VERSIFICATION_SCHEMA':
        AsyncStorage.setItem('versificationSchema', JSON.stringify(action.payload));
        break;
    }
  }, []);

  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
        const savedVersification = await AsyncStorage.getItem('selectedVersification');
        const savedVersificationSchema = await AsyncStorage.getItem('versificationSchema');

        if (savedLanguage) {
          setupDispatch({ type: 'SET_LANGUAGE', payload: JSON.parse(savedLanguage) });
        }
        if (savedVersification) {
          setupDispatch({ type: 'SET_VERSIFICATION', payload: savedVersification });
        }
        if (savedVersificationSchema) {
          setupDispatch({ type: 'SET_VERSIFICATION_SCHEMA', payload: JSON.parse(savedVersificationSchema) });
        } else if (savedVersification) {
          // Load versification schema if it's not saved but versification is
          const schema = await loadVersificationSchema(savedVersification);
          if (schema) {
            setupDispatch({ type: 'SET_VERSIFICATION_SCHEMA', payload: schema });
          }
        }

        // After all loading is complete, set initialLoadComplete to true
        setupDispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true });
      } catch (error) {
        console.error('Error loading initial setup state:', error);
        // Even if there's an error, we should still set initialLoadComplete to true
        setupDispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true });
      }
    };

    loadInitialState();
  }, []);

  return (
    <SetupContext.Provider value={{ state: setupState, dispatch: persistentSetupDispatch }}>
      {children}
    </SetupContext.Provider>
  );
};

export const ReferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [referenceState, referenceDispatch] = useReducer(referenceReducer, {
    ...initialReferenceState,
    initialLoadComplete: false, // Add this to ReferenceState
  });

  const persistentReferenceDispatch = (action: ReferenceAction) => {
    referenceDispatch(action);
    switch (action.type) {
      case 'SET_SELECTED_BOOK':
        if (action.payload) {
          AsyncStorage.setItem('selectedBook', action.payload);
        } else {
          AsyncStorage.removeItem('selectedBook');
        }
        break;
      case 'SET_SELECTED_CHAPTER':
        if (action.payload !== null) {
          AsyncStorage.setItem('selectedChapter', action.payload.toString());
        } else {
          AsyncStorage.removeItem('selectedChapter');
        }
        break;
      case 'SET_VERSE_RANGE':
        if (action.payload) {
          AsyncStorage.setItem('verseRange', JSON.stringify(action.payload));
        } else {
          AsyncStorage.removeItem('verseRange');
        }
        break;
    }
  };

  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const savedBook = await AsyncStorage.getItem('selectedBook');
        const savedChapter = await AsyncStorage.getItem('selectedChapter');
        const savedVerseRange = await AsyncStorage.getItem('verseRange');

        if (savedBook) {
          referenceDispatch({ type: 'SET_SELECTED_BOOK', payload: savedBook });
        }
        if (savedChapter) {
          referenceDispatch({ type: 'SET_SELECTED_CHAPTER', payload: parseInt(savedChapter, 10) });
        }
        if (savedVerseRange) {
          referenceDispatch({ type: 'SET_VERSE_RANGE', payload: JSON.parse(savedVerseRange) });
        }

        // After all loading is complete, set initialLoadComplete to true
        referenceDispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true });
      } catch (error) {
        console.error('Error loading initial reference state:', error);
        // Even if there's an error, we should still set initialLoadComplete to true
        referenceDispatch({ type: 'SET_INITIAL_LOAD_COMPLETE', payload: true });
      }
    };

    loadInitialState();
  }, []);

  return (
    <ReferenceContext.Provider value={{ state: referenceState, dispatch: persistentReferenceDispatch }}>
      {children}
    </ReferenceContext.Provider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SetupProvider>
      <ReferenceProvider>
        {children}
      </ReferenceProvider>
    </SetupProvider>
  );
};

export const useSetupContext = () => {
  const context = useContext(SetupContext);
  if (context === undefined) {
    throw new Error('useSetupContext must be used within a SetupProvider');
  }

  const { state, dispatch } = context;

  // Memoize custom functions
  const setLanguage = useCallback((language: Language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  }, [dispatch]);

  const setVersification = useCallback((versification: string) => { 
    dispatch({ type: 'SET_VERSIFICATION', payload: versification });
  }, [dispatch]);

  const setVersificationSchema = useCallback((schema: VersificationSchema) => {
    dispatch({ type: 'SET_VERSIFICATION_SCHEMA', payload: schema });
  }, [dispatch]);

  const checkSetupComplete = useCallback(() => {
    return state.selectedLanguage !== null && 
           state.selectedVersification !== null && 
           state.versificationSchema !== null;
  }, [state.selectedLanguage, state.selectedVersification, state.versificationSchema]);

  // Memoize the returned object for better performance
  const contextValue = useMemo(() => ({
    state,
    setLanguage,
    setVersification,
    setVersificationSchema,
    checkSetupComplete,
    initialLoadComplete: state.initialLoadComplete, // Add this
  }), [state, setLanguage, setVersification, setVersificationSchema, checkSetupComplete]);

  return contextValue;
};

// Type for the returned object from useSetupContext
export type SetupContextType = ReturnType<typeof useSetupContext>;

export const useReferenceContext = () => {
  const context = useContext(ReferenceContext);
  if (context === undefined) {
    throw new Error('useReferenceContext must be used within a ReferenceProvider');
  }

  const { state, dispatch } = context;

  const setSelectedBook = useCallback((book: string | null) => {
    dispatch({ type: 'SET_SELECTED_BOOK', payload: book });
  }, [dispatch]);

  const setSelectedChapter = useCallback((chapter: number | null) => {
    dispatch({ type: 'SET_SELECTED_CHAPTER', payload: chapter });
  }, [dispatch]);

  const setVerseRange = useCallback((range: [number, number] | null) => {
    dispatch({ type: 'SET_VERSE_RANGE', payload: range });
  }, [dispatch]);

  const checkSelectionComplete = useCallback(() => {
    return state.selectedBook !== null && state.selectedChapter !== null && state.verseRange !== null;
  }, [state.selectedBook, state.selectedChapter, state.verseRange]);

  const contextValue = useMemo(() => ({
    state,
    setSelectedBook,
    setSelectedChapter,
    setVerseRange,
    checkSelectionComplete,
    initialLoadComplete: state.initialLoadComplete, // Add this
  }), [state, setSelectedBook, setSelectedChapter, setVerseRange, checkSelectionComplete]);

  return contextValue;
};

// Type for the returned object from useReferenceContext
export type ReferenceContextType = ReturnType<typeof useReferenceContext>;

const loadVersificationSchema = async (file: string): Promise<VersificationSchema | null> => {
  try {
    // Load predefined schemas
    const schema = versifications[file as keyof typeof versifications];
    if (schema) {
      return schema;
    }
  } catch (error) {
    console.error('Error loading versification schema:', error);
  }
  return null;
};
