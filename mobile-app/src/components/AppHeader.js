import { StyleSheet, Text, View } from 'react-native';
import { palette, spacing, typography } from '../theme/colors';

const AppHeader = ({ eyebrow = '', title, subtitle, rightSlot = null }) => (
  <View style={styles.container}>
    <View style={styles.left}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm
  },
  left: {
    flex: 1,
    gap: 4
  },
  right: {
    minWidth: 56,
    alignItems: 'flex-end'
  },
  eyebrow: {
    ...typography.label,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: palette.secondary
  },
  title: {
    ...typography.title,
    color: palette.textPrimary
  },
  subtitle: {
    ...typography.body,
    color: palette.textSecondary
  }
});

export default AppHeader;
