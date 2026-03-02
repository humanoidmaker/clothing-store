import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import { palette, spacing } from '../theme/colors';

const AppScreen = ({ children, scroll = true, style, contentContainerStyle }) => {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={[styles.wrapper, style]}
          contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={[styles.wrapper, styles.contentContainer, style, contentContainerStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background
  },
  wrapper: {
    flex: 1,
    backgroundColor: palette.background
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
    gap: spacing.md
  }
});

export default AppScreen;
