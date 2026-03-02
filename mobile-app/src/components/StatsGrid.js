import { StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing } from '../theme/colors';

const StatCard = ({ label, value }) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const StatsGrid = ({ items = [] }) => (
  <View style={styles.grid}>
    {items.map((item) => (
      <StatCard key={item.label} label={item.label} value={item.value} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  card: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.sm,
    gap: 4
  },
  label: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: '600'
  },
  value: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  }
});

export default StatsGrid;
