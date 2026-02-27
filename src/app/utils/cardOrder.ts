const CARD_ORDER_STORAGE_KEY = "leofy_card_order_v1";

type CardLike = {
  id: string | number;
};

export function readCardOrder(): string[] {
  try {
    const raw = localStorage.getItem(CARD_ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id)).filter(Boolean);
  } catch {
    return [];
  }
}

export function applyCardOrder<T extends CardLike>(cards: T[]): T[] {
  const order = readCardOrder();
  if (!order.length) return [...cards];

  const rank = new Map(order.map((id, index) => [String(id), index]));
  return [...cards].sort((a, b) => {
    const aRank = rank.has(String(a.id)) ? (rank.get(String(a.id)) as number) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(String(b.id)) ? (rank.get(String(b.id)) as number) : Number.MAX_SAFE_INTEGER;
    if (aRank === bRank) return 0;
    return aRank - bRank;
  });
}

export function persistCardOrder<T extends CardLike>(cards: T[]) {
  try {
    localStorage.setItem(
      CARD_ORDER_STORAGE_KEY,
      JSON.stringify(cards.map((card) => String(card.id)))
    );
  } catch {
  }
}
