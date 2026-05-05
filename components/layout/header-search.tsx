import Link from "next/link";

function IconSearch({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

type Props = {
  className?: string;
};

/** Full search + live results stay on `/search` (no overlay — avoids `<dialog>` + preflight quirks). */
export function HeaderSearch({ className }: Props) {
  return (
    <Link
      href="/search"
      prefetch={false}
      aria-label="Search catalogue"
      className={`rounded p-1 text-black/70 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${className ?? ""}`}
    >
      <IconSearch />
    </Link>
  );
}
