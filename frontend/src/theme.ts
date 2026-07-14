import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "bahulu",

  defaultRadius: "lg",

  fontFamily: "Inter, sans-serif",

  colors: {
    bahulu: [
      "#fff5f5",
      "#ffd9d9",
      "#ffb3b3",
      "#ff8080",
      "#ff4d4d",
      "#E51C23",
      "#b8171c",
      "#8a1115",
      "#5c0b0e",
      "#2b0004",
    ],
  },

  components: {
    Button: {
      defaultProps: {
        radius: "lg",
      },
    },

    Paper: {
      defaultProps: {
        radius: "xl",
      },
    },

    TextInput: {
      defaultProps: {
        radius: "lg",
      },
    },

    PasswordInput: {
      defaultProps: {
        radius: "lg",
      },
    },
  },
});
