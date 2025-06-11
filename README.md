# Passage Recorder

A mobile application for recording scripture passages, designed to support Bible translation and audio scripture projects. Built with React Native and Expo.

## Features

- 📱 **Cross-platform**: Works on iOS and Android
- 🎙️ **Audio Recording**: High-quality audio recording with waveform visualization
- 📖 **Scripture Navigation**: Browse and select biblical passages for recording
- 🌍 **Multi-language Support**: Support for multiple languages and versifications
- 💾 **Local Storage**: Save and manage recordings locally
- 📤 **Export/Share**: Share recordings with other applications
- 🎵 **Audio Playback**: Play back recordings with seek controls
- ⚙️ **Setup Wizard**: Guided setup for language and versification selection

## Screenshots

_Screenshots will be added soon_

## Getting Started

### Prerequisites

- Node.js (version 16 or later)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- For development: Android Studio (Android) or Xcode (iOS)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/unfoldingWord/scripture-simple-recorder.git
   cd scripture-simple-recorder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on your device**
   - Install [Expo Go](https://expo.dev/go) on your mobile device
   - Scan the QR code from the terminal with Expo Go (Android) or Camera app (iOS)
   
   Or run on simulators:
   ```bash
   # Android
   npx expo run:android
   
   # iOS
   npx expo run:ios
   ```

## Project Structure

```
scripture-simple-recorder/
├── app/                    # Main application screens
│   ├── components/         # Reusable UI components
│   ├── index.tsx          # App entry point and routing logic
│   ├── setup.tsx          # Initial setup and configuration
│   ├── navigation.tsx     # Scripture navigation and selection
│   ├── recording.tsx      # Recording interface
│   └── saved-recordings.tsx # Saved recordings management
├── constants/             # App constants and configurations
│   ├── languages/         # Language data and utilities
│   └── versifications/    # Biblical versification data
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── components/            # Shared components
├── assets/               # Images, icons, and other assets
└── scripts/              # Utility scripts
```

## Key Technologies

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and build tools
- **TypeScript** - Type-safe JavaScript
- **Expo Router** - File-based routing
- **Expo AV** - Audio recording and playback
- **AsyncStorage** - Local data persistence
- **NativeWind** - Tailwind CSS for React Native

## Development

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device  
- `npm run web` - Run in web browser
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run download-versifications` - Download biblical versification data

### Adding New Languages

The app supports multiple languages for scripture recording. Language data is stored in `constants/languages/languages.json`. To add support for a new language:

1. Update the languages.json file with the new language data
2. Ensure proper versification data is available
3. Test the recording and playback functionality

## Building for Production

### Android

```bash
# Build APK
npx expo build:android

# Or use EAS Build (recommended)
npx eas build --platform android
```

### iOS

```bash
# Build for iOS
npx expo build:ios

# Or use EAS Build (recommended)
npx eas build --platform ios
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Copyright

Copyright (c) 2025 unfoldingWord

## Support

For support and questions:
- Open an issue on GitHub
- Contact the unfoldingWord development team

## Acknowledgments

- Built with [Expo](https://expo.dev)
- Part of the [unfoldingWord](https://unfoldingword.org) ecosystem
- Designed to support Bible translation and scripture recording projects worldwide
