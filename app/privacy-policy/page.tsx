import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Watch Phase",
  description:
    "How Watch Phase collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold uppercase tracking-[0.06em] text-black">
        Privacy policy
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-black/70">
        <p>
          We collect information that you submit during checkout or contact,
          such as your name, phone number, email, and shipping address, to
          process and deliver your order.
        </p>
        <p>
          We use this information to fulfill orders, provide support, and
          improve service quality. We do not sell customer data to third
          parties.
        </p>
        <p>
          By using this website, you consent to this policy. If you have
          privacy-related questions, contact us using the support details shown
          on the storefront.
        </p>
      </div>
    </main>
  );
}
