import { ThemeIcon } from "@mantine/core";

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 42 }: LogoProps) {
  return (
    <ThemeIcon size={size} radius="xl" variant="light">
      <img
        src="/logo.jpeg"
        alt="Bahulu Berry Cameron"
        width={size}
        height={size}
        style={{
          objectFit: "contain",
        }}
      />
    </ThemeIcon>
  );
}
