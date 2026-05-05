import { NextResponse } from "next/server";
import { createOrderFromValidatedInput } from "@/app/api/orders/create-order-logic";
import { createOrderSchema } from "@/lib/validators/order";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Checkout is unavailable: database not configured." },
      { status: 503 },
    );
  }

  const result = await createOrderFromValidatedInput(data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    orderNumber: result.orderNumber,
    orderId: result.orderId,
    referenceNumber: result.referenceNumber,
  });
}
