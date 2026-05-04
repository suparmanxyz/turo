import { NextResponse } from "next/server";
import { getPricingConfig } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * Public pricing endpoint — return plan list yang `enabled: true` saja.
 * Dipakai landing page untuk display pricing live (tanpa auth).
 *
 * Hanya return public-safe fields (label, price, periodDays, maxUsers, recurring, description, key).
 * History + notes + audit fields tidak di-expose.
 */
export async function GET() {
  try {
    const config = await getPricingConfig();
    const enabledPlans = Object.entries(config.plans)
      .filter(([, p]) => p.enabled)
      .map(([key, p]) => ({
        key,
        label: p.label,
        price: p.price,
        periodDays: p.periodDays,
        maxUsers: p.maxUsers,
        recurring: p.recurring,
        description: p.description ?? null,
      }));
    return NextResponse.json({
      plans: enabledPlans,
      currency: config.currency,
      trial: {
        durationDays: config.trial.durationDays,
        requireCreditCard: config.trial.requireCreditCard,
      },
      freeTier: {
        subMateriPerDay: config.freeTier.subMateriPerDay,
        soalPerDay: config.freeTier.soalPerDay,
      },
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
