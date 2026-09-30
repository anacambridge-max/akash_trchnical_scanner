export type Candle={ts:string;open:number;high:number;low:number;close:number;volume:number};

function ema(values:number[],len:number){const k=2/(len+1);let e=values[0]??0;for(let i=1;i<values.length;i++)e=values[i]*k+e*(1-k);return e}
function avg(a:number[]){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function inWindow(ts:string){const d=new Date(ts);const parts=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);const h=Number(parts.find(x=>x.type==="hour")?.value);const m=Number(parts.find(x=>x.type==="minute")?.value);const mins=h*60+m;return mins>=555&&mins<=595}

export type Levels={pdh:number;pdl:number;pwh:number;pwl:number;pmh:number;pml:number;high52w:number;low52w:number;ath:number;atl:number};

export function buildLevels(daily:Candle[],currentDate:string):Levels{
 const ds=[...daily].sort((a,b)=>a.ts.localeCompare(b.ts)); const curDay=currentDate.slice(0,10);
 const prior=ds.filter(x=>x.ts.slice(0,10)<curDay); if(!prior.length) throw new Error("No prior daily candles");
 const prev=prior[prior.length-1];
 const dayKey=(x:Candle)=>x.ts.slice(0,10);
 const weekKey=(x:Candle)=>{const d=new Date(x.ts);const u=d.getUTCDay();const diff=(u+6)%7;const m=new Date(d);m.setUTCDate(d.getUTCDate()-diff);return m.toISOString().slice(0,10)};
 const weeks=new Map<string,Candle[]>(), months=new Map<string,Candle[]>();
 for(const c of prior){const w=weekKey(c),m=dayKey(c).slice(0,7);(weeks.get(w)??weeks.set(w,[]).get(w)!).push(c);(months.get(m)??months.set(m,[]).get(m)!).push(c)}
 const ws=[...weeks.entries()].sort((a,b)=>a[0].localeCompare(b[0])); const ms=[...months.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 const weeklyHigh=(ws.slice(-1)[0]?.[1]??[]).reduce((x,c)=>Math.max(x,c.high),-Infinity);
 const monthlyHigh=(ms.filter(([k])=>k<curDay.slice(0,7)).slice(-1)[0]?.[1]??[]).reduce((x,c)=>Math.max(x,c.high),-Infinity);
 const last52=ws.slice(-52).flatMap(([,v])=>v); const high52=last52.reduce((x,c)=>Math.max(x,c.high),-Infinity), low52=last52.reduce((x,c)=>Math.min(x,c.low),Infinity);
 const ath=prior.reduce((x,c)=>Math.max(x,c.high),-Infinity), atl=prior.reduce((x,c)=>Math.min(x,c.low),Infinity);
 return {pdh:prev.high,pdl:prev.low,pwh:weeklyHigh,pwl:(ws.slice(-1)[0]?.[1]??[]).reduce((x,c)=>Math.min(x,c.low),Infinity),pmh:monthlyHigh,pml:(ms.filter(([k])=>k<curDay.slice(0,7)).slice(-1)[0]?.[1]??[]).reduce((x,c)=>Math.min(x,c.low),Infinity),high52w:high52,low52w:low52,ath,atl};
}

export function scan(candles:Candle[],levels:Levels){const s=[...candles].sort((a,b)=>a.ts.localeCompare(b.ts));const c=s[s.length-1],p=s[s.length-2];if(!c||!p||!inWindow(c.ts))return {state:"WAIT",direction:"NONE",reason:"Outside scan window"};
 const closes=s.map(x=>x.close),vols=s.map(x=>x.volume), ranges=s.map(x=>x.high-x.low); const e20=ema(closes.slice(-20),20), vAvg=avg(vols.slice(-20));
 const bull=c.close>c.open,bear=c.close<c.open,body=Math.abs(c.close-c.open),range=c.high-c.low,bodyRatio=range?body/range:0,clv=range?(c.close-c.low)/range:0,rangeExpansion=avg(ranges.slice(-10))?range/avg(ranges.slice(-10)):0;
 const buy=[["ATH",levels.ath],["52W",levels.high52w],["MONTH",levels.pmh],["WEEK",levels.pwh],["PDH",levels.pdh]] as const; const sell=[["ATL",levels.atl],["52W",levels.low52w],["MONTH",levels.pml],["WEEK",levels.pwl],["PDL",levels.pdl]] as const;
 const prevClose=p.close;
 const crossed=(a:number,b:number,up:boolean)=>up?c.close>a&&prevClose<=a:c.close<a&&prevClose>=a;
 const b=buy.find(([_,v])=>crossed(v,prevClose,true)), ss=sell.find(([_,v])=>crossed(v,prevClose,false));
 const volMult=vAvg?c.volume/vAvg:0;
 const baseBull=!!b&&bull&&volMult>=1.5&&c.close>e20,baseBear=!!ss&&bear&&volMult>=1.5&&c.close<e20;
 if(baseBull)return {state:"CONFIRMED",direction:"LONG",triggerLevel:b![0],triggerPrice:b![1],volumeMultiple:volMult,rangeExpansion,bodyRatio,closeLocation:clv,reason:"Fresh bullish breakout + volume + EMA20"};
 if(baseBear)return {state:"CONFIRMED",direction:"SHORT",triggerLevel:ss![0],triggerPrice:ss![1],volumeMultiple:volMult,rangeExpansion,bodyRatio,closeLocation:clv,reason:"Fresh bearish breakout + volume + EMA20"};
 return {state:"NO_SIGNAL",direction:"NONE",volumeMultiple:volMult,rangeExpansion,bodyRatio,closeLocation:clv,reason:"Breakout/volume/EMA conditions not all satisfied"};}
