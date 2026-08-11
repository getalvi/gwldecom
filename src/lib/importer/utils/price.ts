import type { ImportConfig } from "../interfaces";

export function applyPriceRules(rawPrice: number, currency: string, config: ImportConfig): number {
  if (!rawPrice) return 0;

  let price = rawPrice;

  // Currency conversion to BDT (approximate rates — in production use a live API)
  if (currency && currency !== "BDT") {
    const rates: Record<string, number> = {
      USD: 110, EUR: 120, GBP: 140, CNY: 15, JPY: 0.75,
      INR: 1.3, AUD: 72, CAD: 82, SGD: 82, MYR: 24,
    };
    price *= rates[currency.toUpperCase()] ?? 110;
  }

  // Markup
  if (config.markupPercent) price *= (1 + config.markupPercent / 100);
  if (config.fixedIncrease) price += config.fixedIncrease;
  if (config.minimumPrice && price < config.minimumPrice) price = config.minimumPrice;
  if (config.autoRound) price = Math.ceil(price / 5) * 5; // Round up to nearest ৳5

  return Math.round(price * 100) / 100;
}

export function extractCurrencySymbol(text: string): string {
  if (text.includes("$")) return "USD";
  if (text.includes("£")) return "GBP";
  if (text.includes("€")) return "EUR";
  if (text.includes("¥") || text.includes("¥")) return "CNY";
  if (text.includes("৳") || text.includes("Tk") || text.toLowerCase().includes("bdt")) return "BDT";
  if (text.includes("₹") || text.toLowerCase().includes("inr")) return "INR";
  if (text.includes("RM")) return "MYR";
  return "BDT";
}
