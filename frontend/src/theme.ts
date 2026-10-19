import { createTheme, type CSSVariablesResolver } from "@mantine/core";

const uiFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const theme = createTheme({
  primaryColor: "bahulu",
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: "sm",
  cursorType: "pointer",
  fontFamily: uiFont,
  fontFamilyMonospace: "ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace",

  fontSizes: { xs: "12px", sm: "14px", md: "14px", lg: "16px", xl: "18px" },
  lineHeights: { xs: "1.45", sm: "1.45", md: "1.5", lg: "1.5", xl: "1.4" },
  radius: { xs: "4px", sm: "6px", md: "8px", lg: "10px", xl: "12px" },
  spacing: { xs: "8px", sm: "12px", md: "16px", lg: "20px", xl: "24px" },
  shadows: {
    xs: "0 1px 2px rgb(24 24 27 / 0.05)",
    sm: "0 1px 3px rgb(24 24 27 / 0.08), 0 1px 2px rgb(24 24 27 / 0.04)",
    md: "0 6px 16px rgb(24 24 27 / 0.08), 0 2px 4px rgb(24 24 27 / 0.04)",
    lg: "0 12px 32px rgb(24 24 27 / 0.12), 0 4px 8px rgb(24 24 27 / 0.04)",
    xl: "0 24px 56px rgb(24 24 27 / 0.16), 0 6px 12px rgb(24 24 27 / 0.05)",
  },

  headings: {
    fontFamily: uiFont,
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "22px", lineHeight: "1.3" },
      h2: { fontSize: "18px", lineHeight: "1.35" },
      h3: { fontSize: "16px", lineHeight: "1.4" },
      h4: { fontSize: "15px", lineHeight: "1.4" },
      h5: { fontSize: "14px", lineHeight: "1.45" },
      h6: { fontSize: "14px", lineHeight: "1.45" },
    },
  },

  colors: {
    dark: ["#e4e4e7", "#a1a1aa", "#8b8b94", "#6f6f78", "#3a3a40", "#2a2a2f", "#1d1d21", "#18181b", "#121214", "#0f0f11"],
    gray: ["#fafafa", "#f4f4f5", "#e9e9ec", "#dcdce0", "#c4c4ca", "#9d9da5", "#6f6f78", "#52525b", "#3f3f46", "#18181b"],
    bahulu: ["#fdf3f3", "#fbe3e3", "#f6c5c6", "#ee9c9e", "#e2686b", "#d03a3e", "#b8171c", "#9a1418", "#7c1215", "#4a0a0c"],
  },

  components: {
    Button: { defaultProps: { size: "sm", fw: 500 } },
    ActionIcon: { defaultProps: { variant: "subtle", color: "gray" } },
    Paper: { defaultProps: { radius: "md" } },
    Card: { defaultProps: { radius: "md", padding: "md" } },
    Badge: { defaultProps: { radius: "sm", variant: "light" } },
    Modal: { defaultProps: { radius: "md", overlayProps: { backgroundOpacity: 0.4, blur: 0 } } },
    Menu: { defaultProps: { radius: "md", shadow: "md" } },
    Popover: { defaultProps: { radius: "md", shadow: "md" } },
    Tooltip: { defaultProps: { radius: "sm", openDelay: 250 } },
    ThemeIcon: { defaultProps: { radius: "sm" } },
    Alert: { defaultProps: { radius: "md" } },
    Tabs: { defaultProps: { color: "bahulu" } },
  },
});

const statusColors = ["gray", "red", "pink", "grape", "violet", "indigo", "blue", "cyan", "teal", "green", "lime", "yellow", "orange", "bahulu"];
const lightBadgeInk = Object.fromEntries(statusColors.map((color) => [
  `--mantine-color-${color}-light-color`,
  `color-mix(in srgb, var(--mantine-color-${color}-9) ${["yellow", "orange", "lime"].includes(color) ? 58 : 78}%, #000)`,
]));

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    ...lightBadgeInk,
    "--mantine-color-body": "#f6f6f7",
    "--mantine-color-text": "#18181b",
    "--mantine-color-dimmed": "#5f6168",
    "--mantine-color-default-border": "#e4e4e7",
    "--mantine-color-default-hover": "#f4f4f5",
    "--mantine-color-placeholder": "#6f6f78",
  },
  dark: {
    "--mantine-color-body": "#0f0f11",
    "--mantine-color-text": "#f4f4f5",
    "--mantine-color-dimmed": "#a1a1aa",
    "--mantine-color-default": "#18181b",
    "--mantine-color-default-border": "#2a2a2f",
    "--mantine-color-default-hover": "#232327",
    "--mantine-color-placeholder": "#8b8b94",
  },
});
