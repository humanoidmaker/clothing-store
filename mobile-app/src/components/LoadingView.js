import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { palette, spacing } from '../theme/colors';

const LoadingView = ({ message = 'Loading...' }) => (
  <View style={styles.container}>
    <ActivityIndicator color={palette.primary} />
    <Text style={styles.text}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl
  },
  text: {
    color: palette.textSecondary,
    fontSize: 13
  }
});

export default LoadingView;
