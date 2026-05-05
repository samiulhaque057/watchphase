import { prisma } from "@/lib/prisma";

export async function getOrdersForAdmin() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      orderNumber: true,
      referenceNumber: true,
      status: true,
      customerEmail: true,
      customerFirstName: true,
      customerLastName: true,
      customerPhone: true,
      shipLine1: true,
      shipLine2: true,
      shipCity: true,
      shipPostal: true,
      shipCountry: true,
      instructions: true,
      subtotalCents: true,
      shippingCents: true,
      totalCents: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          productSlug: true,
          productName: true,
          sku: true,
          quantity: true,
          unitPriceCents: true,
          lineTotalCents: true,
          imageUrl: true,
        },
      },
    },
  });
}

export type AdminOrderPayload = Awaited<
  ReturnType<typeof getOrdersForAdmin>
>[number];

export type SerializedAdminOrder = Omit<
  AdminOrderPayload,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export function serializeAdminOrders(
  rows: AdminOrderPayload[],
): SerializedAdminOrder[] {
  return rows.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }));
}
