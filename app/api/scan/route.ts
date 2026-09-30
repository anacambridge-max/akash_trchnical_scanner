import { NextResponse } from "next/server";
import { scan, buildLevels, Candle } from "@/lib/scanner";

const UPSTOX_INSTRUMENTS="https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";
const NIFTY500_URL="https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv";

function dateKeyIST(d=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
async function instruments(){const r=await fetch(UPSTOX_INSTRUMENTS,{cache:"no-store"});if(!r.ok)throw Error("Upstox instrument master failed");const b=await r.arrayBuffer();const s=new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"));return JSON.parse(await new Response(s).text()) as any[]}
async function nifty500(){const r=await fetch(NIFTY500_URL,{cache:"no-store"});if(!r.ok)throw Error("NIFTY 500 list failed");const t=await r.text();const ls=t.split(/\r?\n/).filter(Boolean),h=ls[0].split(",").map(x=>x.trim().toUpperCase()),i=h.indexOf("SYMBOL"),set=new Set<string>();for(const l of ls.slice(1)){const c=l.split(",").map(x=>x.trim().replace(/^"|"$/g,""));if(i>=0&&c[i])set.add(c[i].toUpperCase())}return set}
function parseCandles(x:any):Candle[]{return (x?.data?.candles??[]).map((c:any)=>({ts:String(c[0]),open:Number(c[1]),high:Number(c[2]),low:Number(c[3]),close:Number(c[4]),volume:Number(c[5])})).filter((c:Candle)=>Object.values(c).every(v=>Number.isFinite(v)));}
async function hist(token:string,key:string,unit:string,interval:string,to:string,from:string){const u=`https://api.upstox.com/v3/historical-candle/${encodeURIComponent(key)}/${unit}/${interval}/${to}/${from}`;const r=await fetch(u,{headers:{Accept:"application/json",Authorization:`Bearer ${token}`},cache:"no-store"});if(!r.ok)throw Error(`Historical ${r.status}`);return parseCandles(await r.json())}

export async function GET(req:Request){
 try{
  const token=process.env.UPSTOX_ACCESS_TOKEN;if(!token)return NextResponse.json({error:"UPSTOX_ACCESS_TOKEN is missing. Add it to .env.local on the scanner machine."},{status:500});
  const qs=new URL(req.url).searchParams;const limit=Math.min(Number(qs.get("limit")||"10"),500);
  const [inst,n500]=await Promise.all([instruments(),nifty500()]);
  const equities=inst.filter(x=>x.segment==="NSE_EQ"&&x.instrument_type==="EQ"&&x.instrument_key&&n500.has(String(x.trading_symbol||"").toUpperCase()));
  const selected=equities.slice(0,limit);
  const today=dateKeyIST(), prior=new Date(Date.now()-15*86400000), weekAgo=new Date(Date.now()-370*86400000), from15=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(prior), fromYear=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(weekAgo);
  const rows:any[]=[];
  for(const e of selected){
   try{
    const [m5,d1]=await Promise.all([hist(token,e.instrument_key,"minutes","5",today,from15),hist(token,e.instrument_key,"days","1",today,fromYear)]);
    const levels=buildLevels(d1,today);const lastSession=m5.filter(c=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata"}).format(new Date(c.ts))===today);
    const s=scan(lastSession,levels);
    rows.push({symbol:e.trading_symbol,instrumentKey:e.instrument_key,...s,ltp:lastSession.at(-1)?.close??null});
   }catch(err){rows.push({symbol:e.trading_symbol,state:"ERROR",direction:"NONE",reason:String(err)})}
  }
  return NextResponse.json({generatedAt:new Date().toISOString(),universeCount:equities.length,scannedCount:selected.length,rows});
 }catch(e){return NextResponse.json({generatedAt:new Date().toISOString(),universeCount:0,rows:[],error:String(e)},{status:500})}
}