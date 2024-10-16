import React, { createContext, useContext, useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

export type Recording = {
  filePath: string;
  fileName: string;
  date: Date;
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

const formatDate = (date: Date, format: string): string => {
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
  const [sections, setSections] = useState<Section[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);

  const loadRecordings = async (language?: string, book?: string, chapter?: string) => {
    const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
    const allRecordings = await listRecursive(recordingsDir);
    
    // Filter recordings based on selected options
    const filteredRecordings = allRecordings.filter(recording => {
      const [lang, bk, ch] = recording.split('/').slice(-4, -1);
      return (
        (!language || lang === language) &&
        (!book || bk === book) &&
        (!chapter || ch === chapter)
      );
    });

    // Group recordings by date
    const groupedRecordings: { [key: string]: Recording[] } = {};
    for (const filePath of filteredRecordings) {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const fileName = filePath.split('/').pop() || '';
      const date = fileInfo.exists ? new Date(fileInfo.modificationTime * 1000) : new Date();
      const dateKey = formatDate(date, 'dd/MM/yyyy');
      const { sound } = await Audio.Sound.createAsync({ uri: filePath });
      const status = await sound.getStatusAsync();
      const duration = status.isLoaded ? status.durationMillis ?? 0 : 0;
      await sound.unloadAsync();

      if (!groupedRecordings[dateKey]) {
        groupedRecordings[dateKey] = [];
      }
      groupedRecordings[dateKey].push({ filePath, fileName, date, duration });
    }

    // Convert grouped recordings to sections
    const newSections: Section[] = Object.entries(groupedRecordings).map(([date, recordings]) => ({
      title: date,
      data: recordings.sort((a, b) => b.date.getTime() - a.date.getTime()),
    })).sort((a, b) => {
      const [aDay, aMonth, aYear] = a.title.split('/').map(Number);
      const [bDay, bMonth, bYear] = b.title.split('/').map(Number);
      return new Date(bYear, bMonth - 1, bDay).getTime() - new Date(aYear, aMonth - 1, aDay).getTime();
    });

    setSections(newSections);

    // Update available options
    const uniqueLanguages = [...new Set(allRecordings.map(r => r.split('/').slice(-4, -3)[0]))];
    setLanguages(uniqueLanguages);

    if (language) {
      const uniqueBooks = [...new Set(allRecordings
        .filter(r => r.includes(`/${language}/`))
        .map(r => r.split('/').slice(-3, -2)[0])
      )];
      setBooks(uniqueBooks);
    }

    if (book) {
      const uniqueChapters = [...new Set(allRecordings
        .filter(r => r.includes(`/${language}/${book}/`))
        .map(r => r.split('/').slice(-2, -1)[0])
      )];
      setChapters(uniqueChapters);
    }
  };

  const addRecording = (recording: Recording) => {
    setSections(prevSections => {
      const dateKey = formatDate(recording.date, 'dd/MM/yyyy');
      const sectionIndex = prevSections.findIndex(section => section.title === dateKey);
      
      if (sectionIndex !== -1) {
        // Add to existing section
        const updatedSection = {
          ...prevSections[sectionIndex],
          data: [recording, ...prevSections[sectionIndex].data]
        };
        return [
          ...prevSections.slice(0, sectionIndex),
          updatedSection,
          ...prevSections.slice(sectionIndex + 1)
        ];
      } else {
        // Create new section
        return [{
          title: dateKey,
          data: [recording]
        }, ...prevSections];
      }
    });
  };

  // Implement listRecursive and formatDate functions here...

  useEffect(() => {
    loadRecordings();
  }, []);

  return (
    <RecordingsContext.Provider value={{ sections, languages, books, chapters, loadRecordings, addRecording }}>
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
