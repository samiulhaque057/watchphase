import { NextResponse } from "next/server";
import { getOrdersForAdmin } from "@/lib/get-orders-for-admin";

export async function GET() {
  const orders = await getOrdersForAdmin();
  return NextResponse.json({ orders });
}
