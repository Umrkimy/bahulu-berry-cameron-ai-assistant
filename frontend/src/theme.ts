import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "bahulu",

  defaultRadius: "lg",

  fontFamily: "Inter, sans-serif",

  headings: {
    fontFamily: "Inter, sans-serif",
    fontWeight: "700",
  },

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
