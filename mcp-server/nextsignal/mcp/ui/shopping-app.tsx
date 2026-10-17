import { useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { McpUiToolResultNotification } from "@modelcontextprotocol/ext-apps";
import { parseShoppingView } from "./types";
import { useShoppingModel, type ShoppingTransport } from "./shopping-model";
import { ShoppingPanel } from "./shopping-panel";
import { PreviewApp } from "./preview-app";

function ShoppingApp() {
  const transport = useRef<ShoppingTransport>(async () => { throw new Error("The shopping app is still connecting."); });
  const model = useShoppingModel(useCallback<ShoppingTransport>((...args) => transport.current(...args), []));
  const receive = useCallback((result: McpUiToolResultNotification["params"]) => {
    const next = parseShoppingView(result.structuredContent);
    if (next) model.apply(next);
  }, [model.apply]);
  const { app, isConnected, error } = useApp({
    appInfo: { name: "denarwise-shopping", version: "2.0.0" }, capabilities: {},
    onAppCreated: (created) => { created.ontoolresult = receive; }
  });
  useHostStyles(app, app?.getHostContext());
  transport.current = async (name, args) => {
    if (!app) throw new Error("The shopping app is still connecting.");
    const result = await app.callServerTool({ name, arguments: args });
    if (result.isError) throw new Error(result.content.find((c) => c.type === "text")?.text ?? "The operation failed.");
    return result.structuredContent;
  };
  return <ShoppingPanel model={model} connected={isConnected} connectionError={error?.message} />;
}

const query = new URLSearchParams(window.location.search);
const theme = query.get("theme");
if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
const mock = query.get("mock");
createRoot(document.getElementById("root")!).render(mock ? <PreviewApp state={mock} /> : <ShoppingApp />);
