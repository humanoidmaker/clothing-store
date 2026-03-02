import { StyleSheet, Text, TextInput, View } from 'react-native';
import { palette, radii, spacing } from '../theme/colors';

const AppInput = ({
  label,
  error,
  style,
  inputStyle,
  multiline = false,
  numberOfLines = 1,
  ...props
}) => (
  <View style={[styles.wrapper, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      placeholderTextColor={palette.textSecondary}
      multiline={multiline}
      numberOfLines={multiline ? numberOfLines : 1}
      style={[styles.input, multiline ? styles.multiline : null, inputStyle]}
      {...props}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    gap: 6
  },
  label: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    color: palette.textPrimary,
    fontSize: 14,
    backgroundColor: palette.surface
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: 'top',
    paddingTop: spacing.sm
  },
  errorText: {
    color: palette.danger,
    fontSize: 12
  }
});

export default AppInput;
