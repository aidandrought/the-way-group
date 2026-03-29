import type { StatusColor } from '../types';

export const uiTheme = {
  colors: {
    appBackground: '#F6F8FB',
    appBackgroundAlt: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F8FAFC',
    surfaceRaised: '#FFFFFF',
    border: 'rgba(15, 23, 42, 0.08)',
    borderStrong: 'rgba(15, 23, 42, 0.14)',
    ink: '#1E293B',
    inkSoft: '#475569',
    inkMuted: '#64748B',
    primary: '#7EBBDD',
    primaryStrong: '#4A81B8',
    primarySurface: '#D9EAF5',
    primaryMuted: '#EEF5FA',
    success: '#16A34A',
    warning: '#D97706',
    accent: '#94A3B8',
    dangerSurface: '#FFF7ED',
    dangerBorder: '#FDBA74',
    dangerText: '#9A3412',
    unread: '#4A81B8',
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    pill: 999,
  },
  shadow: {
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },
    focus: {
      shadowColor: '#4A81B8',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 20,
      elevation: 6,
    },
  },
};

export const STATUS_COLOR_TOKENS: Record<StatusColor, {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}> = {
  blue: {
    borderColor: '#3F73A7',
    backgroundColor: '#7EBBDD',
    textColor: '#1E293B',
    accentColor: '#3F73A7',
  },
  green: {
    borderColor: '#46784F',
    backgroundColor: '#92CD95',
    textColor: '#1E293B',
    accentColor: '#46784F',
  },
  purple: {
    borderColor: '#5A4279',
    backgroundColor: '#AD8CD3',
    textColor: '#1E293B',
    accentColor: '#5A4279',
  },
  orange: {
    borderColor: '#9A5F2B',
    backgroundColor: '#EBB577',
    textColor: '#1E293B',
    accentColor: '#9A5F2B',
  },
  yellow: {
    borderColor: '#C59F11',
    backgroundColor: '#FEF9C3',
    textColor: '#713F12',
    accentColor: '#C59F11',
  },
};

export function getStatusSurface(status: StatusColor | undefined, assigned: boolean) {
  if (status) {
    return STATUS_COLOR_TOKENS[status];
  }

  return assigned
    ? STATUS_COLOR_TOKENS.blue
    : {
        backgroundColor: uiTheme.colors.surface,
        borderColor: uiTheme.colors.border,
        textColor: uiTheme.colors.ink,
        accentColor: uiTheme.colors.primaryStrong,
      };
}
