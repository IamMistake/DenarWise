import type { Metadata } from "next";
import localFont from "next/font/local";
import { DemoExperience } from "./demo-experience";

const deckFont = localFont({
  src: "./fonts/JetBrainsMonoNerdFont-Bold.woff2",
  weight: "700",
  style: "normal",
  variable: "--font-deck",
  display: "swap"
});

export const metadata: Metadata = {
  title: "DenarWise — Same products. Fewer denars.",
  description: "One shared shopping list. Better supermarket prices. See DenarWise in a mobile MCP walkthrough and explore the code behind it.",
  openGraph: {
    title: "DenarWise — Same products. Fewer denars.",
    description: "A guided look at shared shopping, product matching, and personal sale alerts in North Macedonia.",
    type: "website"
  },
  robots: { index: false, follow: false }
};

export default function DemoPage() {
  return <DemoExperience fontClassName={deckFont.variable} />;
}
