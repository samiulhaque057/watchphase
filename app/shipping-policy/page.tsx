import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy | Watch Phase",
  description:
    "Shipping regions, timelines, and delivery fees for Watch Phase orders.",
  alternates: { canonical: "/shipping-policy" },
};

export default function ShippingPolicyPage() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold uppercase tracking-[0.06em] text-black">
        Shipping policy
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-black/70">
        <p>
          Orders are processed after confirmation by our team. Standard delivery
          inside Dhaka typically takes 1 to 2 business days, while deliveries
          outside Dhaka usually take 2 to 5 business days.
        </p>
        <p>
          Shipping charges are shown during checkout and may vary by location.
          Customers will receive delivery updates through the contact details
          provided at order time.
        </p>
        <p>
          Delivery timelines may change during public holidays, weather events,
          or courier disruptions. If a shipment is delayed, our team will update
          you as soon as possible.
        </p>
      </div>
    </main>
  );
}
