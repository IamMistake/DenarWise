// Design-only price matching shapes and SAMPLE data.
// The matching backend does not exist yet: nothing here is real pricing.
// The same module feeds the landing page, the /spaces preview and the in-chat widget.

export const MARKETS = ["Kam", "Ramstore", "Stokomak", "Spar", "Zito", "Vero", "Zur", "Reptil", "Dim"] as const;

export type StorePrice = {
  store: string;
  /** Price in denars (MKD / ден) for one unit. */
  price: number;
};

/** One product merged across every store that sells it. */
export type UniversalProduct = {
  id: string;
  name: string;
  size: string;
  prices: StorePrice[];
};

export type ItemMatch = {
  /** What the user (or their AI) asked for. */
  query: string;
  keywords: string[];
  /** Set when the user insisted on a market, for example "from Kam". */
  pinnedStore?: string;
  products: UniversalProduct[];
  /** Results removed by the AI match check. */
  hiddenCount: number;
  hiddenSamples: string[];
  selectedId: string | null;
  status: "clear" | "choose" | "none";
};

export type BasketLine = {
  quantity: number;
  product: UniversalProduct;
  pinnedStore?: string;
};

export type BasketSummary = {
  splitTotal: number;
  splitStores: string[];
  singleStore: { store: string; total: number } | null;
};

export function parseQuantity(value: string | undefined) {
  return value && /^\d+$/.test(value.trim()) ? Math.max(1, Number.parseInt(value, 10)) : 1;
}

export function formatDenars(amount: number) {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ден`;
}

/** Prices the user can actually buy at: everything, or only the pinned market. */
export function availablePrices(product: UniversalProduct, pinnedStore?: string) {
  const prices = pinnedStore
    ? product.prices.filter((entry) => entry.store === pinnedStore)
    : product.prices;
  return [...prices].sort((left, right) => left.price - right.price);
}

export function cheapestPrice(product: UniversalProduct, pinnedStore?: string) {
  return availablePrices(product, pinnedStore)[0] ?? null;
}

export function summarizeBasket(lines: BasketLine[]): BasketSummary {
  const priced = lines.flatMap((line) => {
    const prices = availablePrices(line.product, line.pinnedStore);
    return prices.length ? [{ ...line, prices }] : [];
  });

  const splitTotal = priced.reduce((sum, line) => sum + line.prices[0].price * line.quantity, 0);
  const splitStores = [...new Set(priced.map((line) => line.prices[0].store))];

  let singleStore: BasketSummary["singleStore"] = null;
  if (priced.length) {
    const candidates = priced[0].prices.map((entry) => entry.store);
    for (const store of candidates) {
      const total = priced.reduce<number | null>((sum, line) => {
        if (sum === null) return null;
        const entry = line.prices.find((price) => price.store === store);
        return entry ? sum + entry.price * line.quantity : null;
      }, 0);
      if (total !== null && (!singleStore || total < singleStore.total)) singleStore = { store, total };
    }
  }

  return { splitTotal, splitStores, singleStore };
}

// ---------------------------------------------------------------------------
// SAMPLE DATA. Invented prices for design purposes only.
// ---------------------------------------------------------------------------

const milk: UniversalProduct = {
  id: "sample-milk-1l",
  name: "Млеко Битолско сино 3.2%",
  size: "1 л",
  prices: [
    { store: "Vero", price: 61 },
    { store: "Kam", price: 64 },
    { store: "Stokomak", price: 65 },
    { store: "Ramstore", price: 66 },
    { store: "Zur", price: 66 },
    { store: "Zito", price: 68 },
    { store: "Spar", price: 69 }
  ]
};

const breadProtein: UniversalProduct = {
  id: "sample-bread-protein",
  name: "Леб Жито протеински",
  size: "500 г",
  prices: [
    { store: "Zito", price: 89 },
    { store: "Ramstore", price: 92 },
    { store: "Kam", price: 95 },
    { store: "Stokomak", price: 98 },
    { store: "Vero", price: 99 }
  ]
};

const breadSeeds: UniversalProduct = {
  id: "sample-bread-seeds",
  name: "Леб протеински со семки",
  size: "500 г",
  prices: [
    { store: "Ramstore", price: 96 },
    { store: "Kam", price: 99 },
    { store: "Spar", price: 105 }
  ]
};

const yogurt: UniversalProduct = {
  id: "sample-yogurt-1l",
  name: "Јогурт Бигла 2.8%",
  size: "1 л",
  prices: [
    { store: "Vero", price: 69 },
    { store: "Ramstore", price: 70 },
    { store: "Kam", price: 72 },
    { store: "Dim", price: 73 }
  ]
};

export const sampleMatches: Record<"milk" | "bread" | "yogurt" | "kefir", ItemMatch> = {
  milk: {
    query: "Mleko 3.2% bitolsko plavo",
    keywords: ["mleko", "bitolsko"],
    products: [milk],
    hiddenCount: 12,
    hiddenSamples: ["Вафли со млеко 150 г", "Чоколадо млечно 80 г", "Крем со млеко 200 мл"],
    selectedId: milk.id,
    status: "clear"
  },
  bread: {
    query: "Zito leb proteinski 500g",
    keywords: ["leb", "proteinski", "zito"],
    products: [breadProtein, breadSeeds],
    hiddenCount: 8,
    hiddenSamples: ["Леб тост бел 500 г", "Протеинска плочка 60 г"],
    selectedId: null,
    status: "choose"
  },
  yogurt: {
    query: "Jogurt 1l from Kam",
    keywords: ["jogurt", "1l"],
    pinnedStore: "Kam",
    products: [yogurt],
    hiddenCount: 5,
    hiddenSamples: ["Јогурт овошен 200 г", "Пудинг од јогурт 125 г"],
    selectedId: yogurt.id,
    status: "clear"
  },
  kefir: {
    query: "Kefir od kozjo mleko",
    keywords: ["kefir", "kozjo", "mleko"],
    products: [],
    hiddenCount: 31,
    hiddenSamples: ["Кефир 2.5% 1 л", "Козјо сирење 200 г"],
    selectedId: null,
    status: "none"
  }
};

export const sampleBasket = {
  lines: [
    { quantity: 2, product: milk },
    { quantity: 1, product: breadProtein }
  ] satisfies BasketLine[],
  spaceName: "Home"
};
