import Image from "next/image";

// Logos downloaded from each market's own website (see public/markets).
const LOGOS: Record<string, { src: string; width: number; height: number }> = {
  Kam: { src: "/markets/kam.png", width: 180, height: 180 },
  Ramstore: { src: "/markets/ramstore.png", width: 220, height: 90 },
  Stokomak: { src: "/markets/stokomak.png", width: 256, height: 256 },
  Spar: { src: "/markets/spar.png", width: 256, height: 256 },
  Zito: { src: "/markets/zito.png", width: 256, height: 103 },
  Vero: { src: "/markets/vero.png", width: 180, height: 180 },
  Zur: { src: "/markets/zur.png", width: 317, height: 56 },
  Reptil: { src: "/markets/reptil.png", width: 231, height: 165 },
  Dim: { src: "/markets/dim.png", width: 192, height: 192 }
};

/** A market's logo sized to a fixed height, capped in width so long wordmarks stay tidy. */
export function MarketLogo({ market, size = 28, maxWidth }: { market: string; size?: number; maxWidth?: number }) {
  const logo = LOGOS[market];
  if (!logo) {
    return <span className="hs-logo-fallback" style={{ width: size, height: size }} aria-hidden="true">{market.slice(0, 1)}</span>;
  }

  const limit = maxWidth ?? size * 3.2;
  const ratio = logo.width / logo.height;
  const width = Math.min(size * ratio, limit);
  const height = width / ratio;

  return (
    <Image
      className="hs-logo-img"
      src={logo.src}
      alt=""
      width={Math.round(width)}
      height={Math.round(height)}
      style={{ width: Math.round(width), height: Math.round(height) }}
      aria-hidden="true"
    />
  );
}

/** Logo + name, used wherever a market is listed. */
export function MarketChip({ market, size = 28, className = "" }: { market: string; size?: number; className?: string }) {
  return (
    <span className={`hs-market ${className}`.trim()}>
      <span className="hs-market-logo" style={{ minWidth: size + 12, height: size + 12 }}>
        <MarketLogo market={market} size={size} />
      </span>
      <span className="hs-market-name">{market}</span>
    </span>
  );
}
