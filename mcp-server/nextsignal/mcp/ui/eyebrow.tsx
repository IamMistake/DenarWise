import { BagIcon } from "./icons";
export function Eyebrow({ label }: { label: string }) {
  return <div className="eyebrow"><span className="eyebrow-pill"><span className="eyebrow-mark"><BagIcon /></span>{label}</span></div>;
}
