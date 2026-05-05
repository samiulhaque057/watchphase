import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { orderStatusPatchSchema } from "@/lib/validators/order";
import { prisma } from "@/lib/prisma";

type RouteCtx = {
  params: Promise<{ orderId: string }>;
};

const STATUS_MAP: Record<string, OrderStatus> = {
  NEW: OrderStatus.NEW,
  PROCESSING: OrderStatus.PROCESSING,
  SHIPPED: OrderStatus.SHIPPED,
  COMPLETED: OrderStatus.COMPLETED,
  CANCELLED: OrderStatus.CANCELLED,
};

export async function PATCH(request: Request, { params }: RouteCtx) {
  const { orderId } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = orderStatusPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const nextStatus = STATUS_MAP[parsed.data.status];
  if (!nextStatus) {
    return NextResponse.json({ error: "Bad status." }, { status: 400 });
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const { orderId } = await params;
  try {
    await prisma.order.delete({
      where: { id: orderId },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
}
