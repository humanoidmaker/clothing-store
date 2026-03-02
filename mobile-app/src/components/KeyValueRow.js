import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme/colors';

const KeyValueRow = ({ label, value, muted = false }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, muted ? styles.valueMuted : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  label: {
    color: palette.textSecondary,
    fontSize: 12,
    flexShrink: 1
  },
  value: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1
  },
  valueMuted: {
    color: palette.textSecondary,
    fontWeight: '500'
  }
});

export default KeyValueRow;
