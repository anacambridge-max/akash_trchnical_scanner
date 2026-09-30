"use client";
import {useState} from "react";

type Row={symbol:string;state:string;direction:string;triggerLevel?:string;triggerPrice?:number;ltp?:number;volumeMultiple?:number;rangeExpansion?:number;bodyRatio?:number;closeLocation?:number;reason?:string};
type Api={generatedAt:string;universeCount:number;rows:Row[];error?:string};

export default function Page(){
 const [data,setData]=useState<Api|null>(null),[loading,setLoading]=useState(false);
 async function scan(){
  setLoading(true);
  try{const r=await fetch("/api/scan",{cache:"no-store"}); const j=await r.json(); setData(j);}
  catch(e){setData({generatedAt:new Date().toISOString(),universeCount:0,rows:[],error:String(e)})}
  finally{setLoading(false)}
 }
 return <main>
  <h1>Akash Technical Scanner</h1><p className="muted">NIFTY 500 • 5-minute • 09:15–09:55 • Pine breakout logic</p>
  <div className="panel row"><button className="btn" onClick={scan} disabled={loading}>{loading?"Scanning…":"RUN SCAN"}</button><span className="muted">{data?.generatedAt?new Date(data.generatedAt).toLocaleString():"Not scanned"}</span></div>
  <div className="grid">
   <div className="panel"><div className="muted">Universe</div><div className="stat">{data?.universeCount??"—"}</div></div>
   <div className="panel"><div className="muted">Confirmed</div><div className="stat">{data?.rows.filter(x=>x.state==="CONFIRMED").length??"—"}</div></div>
   <div className="panel"><div className="muted">BUY</div><div className="stat buy">{data?.rows.filter(x=>x.direction==="LONG"&&x.state==="CONFIRMED").length??"—"}</div></div>
   <div className="panel"><div className="muted">SELL</div><div className="stat sell">{data?.rows.filter(x=>x.direction==="SHORT"&&x.state==="CONFIRMED").length??"—"}</div></div>
  </div>
  {data?.error&&<div className="panel error">{data.error}</div>}
  <div className="panel" style={{overflow:"auto"}}>
   <table className="table"><thead><tr>{["Stock","State","Direction","Trigger","Level","LTP","Vol×","Range×","Body","CLV","Reason"].map(x=><th key={x}>{x}</th>)}</tr></thead>
   <tbody>{(data?.rows??[]).map((x,i)=><tr key={i}><td>{x.symbol}</td><td><span className="badge">{x.state}</span></td><td className={x.direction==="LONG"?"buy":"sell"}>{x.direction}</td><td>{x.triggerLevel??"—"}</td><td>{x.triggerPrice?.toFixed(2)??"—"}</td><td>{x.ltp?.toFixed(2)??"—"}</td><td>{x.volumeMultiple?.toFixed(2)??"—"}</td><td>{x.rangeExpansion?.toFixed(2)??"—"}</td><td>{x.bodyRatio?.toFixed(2)??"—"}</td><td>{x.closeLocation?.toFixed(2)??"—"}</td><td>{x.reason??"—"}</td></tr>)}</tbody></table>
  </div>
 </main>
}