import { useComputedColorScheme } from "@mantine/core";

export function useChartTheme() {
  const dark = useComputedColorScheme("light") === "dark";
  return dark
    ? { dark, label: "#a1a1aa", axis: "#3f3f46", split: "#2a2a2f", ink: "#f4f4f5", surface: "#18181b", berry: "#ec6f73", berryFill: "rgba(236, 111, 115, 0.22)", neutral: "#71717a", muted: "#3f3f46" }
    : { dark, label: "#71717a", axis: "#e4e4e7", split: "#efeff1", ink: "#18181b", surface: "#ffffff", berry: "#b8171c", berryFill: "rgba(184, 23, 28, 0.14)", neutral: "#52525b", muted: "#d4d4d8" };
}
