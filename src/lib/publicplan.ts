import type { Plan } from "./types";

export const publicPlan = (p: Plan) => ({
  id: p._id.toString(), name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, maxLinks: p.maxLinks,
  analyticsLevel: p.analyticsLevel, removeBranding: p.removeBranding, trialDays: p.trialDays, isFree: p.isFree,
  allThemes: p.allowedThemes.includes("*"),
});
