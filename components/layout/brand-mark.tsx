import Link from "next/link";

type BrandMarkProps = {
  className?: string;
  size?: "header" | "footer";
};

export function BrandMark({ className = "", size = "header" }: BrandMarkProps) {
  const fontSize =
    size === "header"
      ? "text-[1.5rem] sm:text-[1.625rem] md:text-[1.75rem]"
      : "text-xl sm:text-2xl md:text-[1.625rem]";

  return (
    <Link
      href="/"
      aria-label="Watch Phase home"
      className={`inline-block whitespace-nowrap text-black [font-family:var(--font-playfair-display)] font-semibold tracking-[0.04em] antialiased ${fontSize} ${className}`}
    >
      Watch Phase
    </Link>
  );
}
