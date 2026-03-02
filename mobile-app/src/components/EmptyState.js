import { StyleSheet, Text, View } from 'react-native';
import { palette, spacing, typography } from '../theme/colors';

const EmptyState = ({ title, message }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.xs
  },
  title: {
    ...typography.section,
    fontSize: 16,
    color: palette.textPrimary
  },
  message: {
    ...typography.body,
    color: palette.textSecondary
  }
});

export default EmptyState;
