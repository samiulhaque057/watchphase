import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Watch Phase",
  description: "Terms and conditions for using the Watch Phase website and services.",
  alternates: { canonical: "/terms-of-service" },
};

export default function TermsOfServicePage() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold uppercase tracking-[0.06em] text-black">
        Terms of service
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-black/70">
        <p>
          These terms govern use of this website and purchases made through
          Watch Phase. By placing an order, you confirm that the details you provide
          are accurate and complete.
        </p>
        <p>
          Product availability, pricing, and specifications may change without
          prior notice. Final confirmation is provided by our team at the time
          of order processing.
        </p>
        <p>
          Continued use of the site means you agree to the latest version of
          these terms published on this page.
        </p>
      </div>
    </main>
  );
}
