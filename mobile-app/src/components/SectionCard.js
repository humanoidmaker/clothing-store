import { StyleSheet, View } from 'react-native';
import { palette, radii, spacing } from '../theme/colors';

const SectionCard = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm
  }
});

export default SectionCard;
