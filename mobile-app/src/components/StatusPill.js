import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme/colors';

const statusColors = {
  pending: '#b87b00',
  processing: '#2563eb',
  paid: '#2b7a5e',
  shipped: '#0f766e',
  delivered: '#15803d',
  cancelled: '#b42318',
  visible: '#15803d',
  hidden: '#b87b00',
  active: '#2b7a5e',
  inactive: '#6b7280'
};

const StatusPill = ({ label, status }) => {
  const color = statusColors[String(status || '').toLowerCase()] || palette.primary;
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: `${color}15` }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start'
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize'
  }
});

export default StatusPill;
