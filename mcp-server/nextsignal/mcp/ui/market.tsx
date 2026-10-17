import { marketLogos } from "./generated/market-logos";
const markets: Record<string, string> = Object.fromEntries(Object.keys(marketLogos).map((name) => [name.toLowerCase(), name]));
export function Market({ name }: { name: string }) {
  const label = markets[name.toLowerCase()] ?? name;
  const src = marketLogos[label];
  return <span className="market">{src && <span className="logo"><img src={src} alt="" /></span>}<span>{label}</span></span>;
}
