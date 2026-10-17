/** Local fixture host for exercising the real MCP App transport. No database or model calls. */
import { createServer } from "node:http";
import { shoppingAppHtml } from "../nextsignal/mcp/ui/generated/shopping-app-html";
import type { ShoppingView } from "../nextsignal/mcp/ui/types";
import { parseAttributes } from "../nextsignal/catalog/normalize";
const product = (id: string, name: string) => ({ id, name, anchorName: name, attributes: parseAttributes(name), keywords: [] });
const choices = [
  { product: product("milk", "Битолско УХТ млеко 3.2% 1 L"), kind: "possible" as const, probability: 0.94, warnings: ["Requested packaging colour is unverified."], marketCount: 4, cheapestPrice: 68 },
  { product: product("bread", "Жито Лукс протеински тост леб 400 g"), kind: "alternative" as const, probability: 0.96, warnings: ["Package size: requested 500 g; found 400 g."], marketCount: 5, cheapestPrice: 82 }
];
const initial: ShoppingView = { view: "added", status: "draft", spaceId: "home", confirmationId: crypto.randomUUID(), spaces: [{ id: "home", name: "Our home" }, { id: "weekend", name: "Weekend" }], stores: ["kam", "vero", "ramstore"],
  items: choices.map((choice, i) => ({ id: `draft-${i}`, spaceId: "home", name: i ? "Zito leb proteinski 500g" : "Mleko 3.2% bitolsko plavo", originalQuery: i ? "Zito leb proteinski 500g" : "Mleko 3.2% bitolsko plavo", quantity: i ? "1" : "2", store: null, requestedStore: null, productId: null, createdAt: new Date().toISOString(), matching: { choices: [choice], selectedProductId: null, warnings: ["Prices are the cheapest found."], incomplete: false } })) };
const source = `
const initial = ${JSON.stringify(initial)};
let current = structuredClone(initial);
const frame = document.querySelector('iframe');
function send(message) { frame.contentWindow.postMessage({jsonrpc:'2.0', ...message}, '*'); }
function show(view) { current.view = view; send({method:'ui/notifications/tool-result',params:{structuredContent:current,content:[]}}); }
window.addEventListener('message', (event) => {
 if (event.source !== frame.contentWindow) return;
 const message = event.data;
 if (message.method === 'ui/initialize') send({id:message.id,result:{protocolVersion:message.params.protocolVersion,hostInfo:{name:'DenarWise fixture host',version:'1'},hostCapabilities:{},hostContext:{theme:'light'}}});
 else if (message.method === 'ui/notifications/initialized') show('added');
 else if (message.method === 'ui/notifications/size-changed') frame.style.height = message.params.height+'px';
 else if (message.method === 'tools/call') {
  const { name, arguments: args } = message.params;
  document.querySelector('pre').textContent = JSON.stringify({name,arguments:args},null,2);
  let result;
  if (name === 'shopping_ui_search_products') result={itemId:args.itemId,matching:initial.items.find(i=>i.id===args.itemId).matching};
  else {
   if(name==='shopping_ui_add_items') {
    current={...current,status:'saved',spaceId:args.spaceId,items:args.items.map((item,index)=>{
     const choice=initial.items.flatMap(i=>i.matching.choices).find(c=>c.product.id===item.productId);
     return {id:'saved-'+index,spaceId:args.spaceId,name:choice?choice.product.name:item.query,originalQuery:item.query,quantity:String(item.quantity),requestedStore:item.store??null,store:item.productId?'vero':item.store??null,productId:item.productId,createdAt:new Date().toISOString(),recommendation:{status:item.productId?'priced':'manual',lineTotal:item.productId?70*item.quantity:null,stale:false,incomplete:false,offer:item.productId?{market:'vero',branch:'Vero 9',price:70,retrievedAt:new Date().toISOString(),sourceUpdatedAt:'2026-10-17 12:00',saleType:'Promotion',promoPeriod:'16–25 October'}:null}};
    })};
   }
   if(name==='shopping_ui_update_items') current.items=current.items.map(i=>{
    const u=args.updates?.find(u=>u.id===i.id)??{};
    const quantity=String(u.quantity??i.quantity);
    const requestedStore=u.store===undefined?i.requestedStore:u.store;
    return {...i,...u,quantity,requestedStore,store:i.productId?'vero':requestedStore,recommendation:{...i.recommendation,lineTotal:i.recommendation.offer?i.recommendation.offer.price*Number(quantity):null}};
   });
   if(name==='shopping_ui_clear_items') current.items=current.items.filter(i=>!args.ids.includes(i.id));
   result=current;
  }
  send({id:message.id,result:{content:[],structuredContent:result}});
 }
});
document.querySelector('#list').onclick=()=>show('list');
document.querySelector('#review').onclick=()=>{current=structuredClone(initial);show('added')};
`;
createServer((request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(request.url === "/widget" ? shoppingAppHtml : `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>DenarWise widget checks</title></head><body style="margin:0;background:#f4f5f1;font-family:system-ui"><nav style="padding:12px"><strong>DenarWise · local fixture host</strong> <button id="review">Review fixture</button> <button id="list">List fixture</button></nav><iframe title="Shopping widget" src="/widget" style="display:block;border:0;width:100%;height:1000px"></iframe><pre style="padding:12px;white-space:pre-wrap"></pre><script>${source}</script></body></html>`);
}).listen(4318, "127.0.0.1", () => console.log("Widget fixture host: http://127.0.0.1:4318"));
