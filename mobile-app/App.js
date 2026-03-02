import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

const App = () => (
  <GestureHandlerRootView style={styles.root}>
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <RootNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff'
  }
});

export default App;
