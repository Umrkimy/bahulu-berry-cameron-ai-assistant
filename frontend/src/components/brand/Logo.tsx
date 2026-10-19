interface LogoProps {
  size?: number;
  alt?: string;
}

export default function Logo({ size = 42, alt = "Bahulu Berry Cameron" }: LogoProps) {
  return (
    <img
      className="brand-logo"
      src="/logo.jpeg"
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24), objectFit: "cover", flexShrink: 0 }}
    />
  );
}
