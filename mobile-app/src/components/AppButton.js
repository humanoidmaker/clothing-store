import { Pressable, StyleSheet, Text } from 'react-native';
import { palette, radii, spacing } from '../theme/colors';

const AppButton = ({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle
}) => {
  const variantStyle =
    variant === 'secondary'
      ? styles.secondary
      : variant === 'danger'
        ? styles.danger
        : variant === 'ghost'
          ? styles.ghost
          : styles.primary;

  const variantTextStyle =
    variant === 'ghost'
      ? styles.ghostText
      : variant === 'secondary'
        ? styles.secondaryText
        : styles.primaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style
      ]}
    >
      <Text style={[styles.text, variantTextStyle, textStyle]}>{children}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  primary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary
  },
  secondary: {
    backgroundColor: palette.secondary,
    borderColor: palette.secondary
  },
  danger: {
    backgroundColor: palette.danger,
    borderColor: palette.danger
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: palette.border
  },
  text: {
    fontSize: 14,
    fontWeight: '700'
  },
  primaryText: {
    color: '#fff'
  },
  secondaryText: {
    color: '#fff'
  },
  ghostText: {
    color: palette.textPrimary
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.6
  }
});

export default AppButton;
