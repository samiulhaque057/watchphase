import Link from "next/link";

const STORE_NAME = "Watch Phase";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white py-10">
      <div className="container mx-auto px-4">
        <div
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-gray-500"
          role="navigation"
          aria-label="Copyright and policies"
        >
          <span>
            © {year}, {STORE_NAME}. All rights reserved.
          </span>
          <span aria-hidden className="select-none">
            ·
          </span>
          <Link
            href="/privacy-policy"
            className="rounded-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Privacy policy
          </Link>
          <span aria-hidden className="select-none">
            ·
          </span>
          <Link
            href="/terms-of-service"
            className="rounded-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Terms of service
          </Link>
          <span aria-hidden className="select-none">
            ·
          </span>
          <Link
            href="/shipping-policy"
            className="rounded-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Shipping policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
