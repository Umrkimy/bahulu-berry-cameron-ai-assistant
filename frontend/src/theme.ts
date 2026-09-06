import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "bahulu",

  defaultRadius: "md",

  fontFamily: "Inter, 'Segoe UI', sans-serif",

  headings: {
    fontFamily: "Inter, sans-serif",
    fontWeight: "700",
  },

  colors: {
    cream: ["#fffdf8", "#faf5eb", "#f1e9d7", "#e6d9bb", "#d8c69b", "#cab27b", "#b79a60", "#987e4d", "#78633e", "#59492e"],
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
        fw: 600,
      },
    },

    Paper: {
      defaultProps: {
        radius: "lg",
      },
    },

    Card: {
      defaultProps: {
        radius: "lg",
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

    Select: {
      defaultProps: {
        radius: "lg",
      },
    },

    NumberInput: {
      defaultProps: {
        radius: "lg",
      },
    },
  },
});
