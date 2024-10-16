import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Recording = {
  filePath: string;
  fileName: string;
  date: string; // Changed from Date to string
  duration: number;
};

export type Section = {
  title: string;
  data: Recording[];
};

type RecordingsContextType = {
  sections: Section[];
  languages: string[];
  books: string[];
  chapters: string[];
  loadRecordings: (language?: string, book?: string, chapter?: string) => Promise<void>;
  addRecording: (recording: Recording) => void;
  isLoading: boolean;
};

const RecordingsContext = createContext<RecordingsContextType | undefined>(undefined);

const listRecursive = async (dir: string): Promise<string[]> => {
  try {
    const dirExists = await FileSystem.getInfoAsync(dir);
    if (!dirExists.exists || !dirExists.isDirectory) {
      console.warn(`Directory does not exist: ${dir}`);
      return [];
    }

    const files = await FileSystem.readDirectoryAsync(dir);
    let recordings: string[] = [];
    for (const file of files) {
      const filePath = `${dir}${file}`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        if (info.isDirectory) {
          recordings = [...recordings, ...(await listRecursive(`${filePath}/`))];
        } else if (file.endsWith('.m4a')) {
          recordings.push(filePath);
        }
      } else {
        console.warn(`File or directory does not exist: ${filePath}`);
      }
    }
    return recordings;
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
};

const formatDate = (dateString: string, format: string): string => {
  const date = new Date(dateString);
  const pad = (num: number) => num.toString().padStart(2, '0');
  return format.replace(/dd|MM|yyyy/g, (match) => {
    switch (match) {
      case 'dd': return pad(date.getDate());
      case 'MM': return pad(date.getMonth() + 1);
      case 'yyyy': return date.getFullYear().toString();
      default: return match;
    }
  });
};

export const RecordingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [filteredSections, setFilteredSections] = useState<Section[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setIsLoading(true);
    try {
      const cachedData = await AsyncStorage.getItem('recordingsCache');
      if (cachedData) {
        const { sections: cachedSections, languages: cachedLanguages, books: cachedBooks, chapters: cachedChapters } = JSON.parse(cachedData);
        setAllSections(cachedSections);
        setFilteredSections(cachedSections);
        setLanguages(cachedLanguages);
        setBooks(cachedBooks);
        setChapters(cachedChapters);
      } else {
        // If no cached data, load from file system
        await loadFreshData();
      }
    } catch (error) {
      console.error('Error initializing recordings data:', error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const loadRecordings = useCallback(async (language?: string, book?: string, chapter?: string) => {
    if (!isInitialized) {
      console.log('Data not yet initialized, skipping loadRecordings');
      return;
    }
    
    // Filter sections based on the provided parameters
    const filtered = allSections.map(section => ({
      ...section,
      data: section.data.filter(recording => {
        const [recordingLang, recordingBook, recordingChapter] = recording.filePath.split('/').slice(-4, -1);
        return (
          (!language || recordingLang === language) &&
          (!book || recordingBook === book) &&
          (!chapter || recordingChapter === chapter)
        );
      })
    })).filter(section => section.data.length > 0);

    setFilteredSections(filtered);
  }, [allSections, isInitialized]);

  const loadFreshData = async () => {
    console.log('Starting loadFreshData');
    const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
    const allRecordings = await listRecursive(recordingsDir);
    console.log('All recordings:', allRecordings);
    
    const newRecordings = await Promise.all(allRecordings.map(processRecording));
    console.log('Processed recordings:', newRecordings);
    
    const updatedSections = updateSections(newRecordings);
    console.log('Updated sections:', updatedSections);

    const { updatedLanguages, updatedBooks, updatedChapters } = updateOptions(allRecordings);
    console.log('Updated options - languages:', updatedLanguages, 'books:', updatedBooks, 'chapters:', updatedChapters);

    const cacheData = JSON.stringify({ 
      sections: updatedSections, 
      languages: updatedLanguages, 
      books: updatedBooks, 
      chapters: updatedChapters 
    });
    console.log('Caching data:', cacheData);
    try {
      await AsyncStorage.setItem('recordingsCache', cacheData);
      console.log('Data cached successfully');
      
      setAllSections(updatedSections);
      setFilteredSections(updatedSections);
      setLanguages(updatedLanguages);
      setBooks(updatedBooks);
      setChapters(updatedChapters);
    } catch (error) {
      console.error('Error caching recordings data:', error);
    }
  };

  const processRecording = async (filePath: string): Promise<Recording> => {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    const fileName = filePath.split('/').pop() || '';
    const date = fileInfo.exists 
      ? new Date(fileInfo.modificationTime * 1000).toISOString()
      : new Date().toISOString();
    const { sound } = await Audio.Sound.createAsync({ uri: filePath });
    const status = await sound.getStatusAsync();
    const duration = status.isLoaded ? status.durationMillis ?? 0 : 0;
    await sound.unloadAsync();
    return { filePath, fileName, date, duration };
  };

  const updateSections = (newRecordings: Recording[]): Section[] => {
    const updatedSections = newRecordings.reduce((acc, recording) => {
      const dateKey = formatDate(recording.date, 'dd/MM/yyyy');
      const sectionIndex = acc.findIndex(section => section.title === dateKey);
      if (sectionIndex !== -1) {
        acc[sectionIndex].data.push(recording);
      } else {
        acc.push({ title: dateKey, data: [recording] });
      }
      return acc;
    }, [] as Section[]);

    return updatedSections.sort((a, b) => new Date(a.title).getTime() - new Date(b.title).getTime());
  };

  const updateOptions = (allRecordings: string[]): { updatedLanguages: string[], updatedBooks: string[], updatedChapters: string[] } => {
    console.log('Updating options with:', allRecordings);
    const updatedLanguages = [...new Set(allRecordings.map(r => r.split('/').slice(-4, -3)[0]))];
    const updatedBooks = [...new Set(allRecordings.map(r => r.split('/').slice(-3, -2)[0]))];
    const updatedChapters = [...new Set(allRecordings.map(r => r.split('/').slice(-2, -1)[0]))];

    return { updatedLanguages, updatedBooks, updatedChapters };
  };

  const addRecording = (recording: Recording) => {
    setAllSections(prevSections => {
      const newSections = updateSections([...prevSections.flatMap(s => s.data), recording]);
      
      // Update AsyncStorage in the background
      AsyncStorage.setItem('recordingsCache', JSON.stringify({
        sections: newSections,
        languages,
        books,
        chapters
      })).catch(error => console.error('Error updating AsyncStorage:', error));

      // Update filtered sections
      setFilteredSections(newSections);

      return newSections;
    });

    // Update languages, books, and chapters
    const [lang, book, chapter] = recording.filePath.split('/').slice(-4, -1);
    setLanguages(prev => Array.from(new Set([...prev, lang])));
    setBooks(prev => Array.from(new Set([...prev, book])));
    setChapters(prev => Array.from(new Set([...prev, chapter])));
  };

  return (
    <RecordingsContext.Provider value={{ sections: filteredSections, languages, books, chapters, loadRecordings, addRecording, isLoading }}>
      {children}
    </RecordingsContext.Provider>
  );
};

export const useRecordings = () => {
  const context = useContext(RecordingsContext);
  if (context === undefined) {
    throw new Error('useRecordings must be used within a RecordingsProvider');
  }
  return context;
};
