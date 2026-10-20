import { useId } from "react";

/** A small, live view of the same five plots; height records lessons, never wealth. */
export function VillagePicture({ built = 0, total = 3 }: { built?: number; total?: number }) {
  const sky = useId();
  return <svg className="v9-village-picture" viewBox="0 0 360 160" role="img" aria-label={`Your village · ${built} of ${total} lessons complete`}>
    <defs><linearGradient id={sky} x2="0" y2="1"><stop stopColor="#253966"/><stop offset=".72" stopColor="#557bb3"/><stop offset="1" stopColor="#285a78"/></linearGradient></defs>
    <rect width="360" height="160" fill={`url(#${sky})`}/>
    <path d="M0 112H360V160H0Z" fill="#205474"/>
    <path d="M69 94 180 41 295 95 183 154Z" fill="#438562"/>
    <path d="M69 84 180 31 295 85 183 144Z" fill="#8dcd8a"/>
    <path d="m84 84 96-45 99 46-96 50Z" fill="#566479"/>
    <path d="m96 84 84-38 86 39-83 41Z" fill="#b9df96"/>
    <path d="m246 110 82 45" stroke="#73849a" strokeWidth="12"/>
    <path d="m250 111 78 43" stroke="#e9e4d6" strokeDasharray="7 7" strokeWidth="1.5"/>
    <path d="m175 64 30 54m-75-30 109 1" stroke="#ecdbad" strokeWidth="8"/>
    <g><path d="m146 67 20 11 19-10V37l-19-11-20 11Z" fill="#eac59a"/><path d="m166 78 19-10V37l-19 10Z" fill="#c6a17f"/><path d="m140 38 25-26 26 15-6 10-19-11-20 18Z" fill="#db7046"/><path d="m153 48 7 4v8l-7-4m0 8 7 4v8l-7-4" fill="#ffe398"/></g>
    <g><path d="m112 86 19 10 18-9V73l-18-10-19 10Z" fill="#79bed0"/><path d="m112 73 19-10 18 10-18 10Z" fill="#cdf0df"/></g>
    <g><path d="m218 85 21 11 20-11V73l-20-11-21 11Z" fill="#96aabd"/><path d="m218 73 21-11 20 11-20 11Z" fill="#d5e1e3"/></g>
    <g><path d="m141 109 18 10 18-10V96l-18-9-18 9Z" fill="#e4d5ba"/><path d="m141 96 18-9 18 9-18 9Z" fill="#f9edd3"/></g>
    <path d="m187 111 23-12 24 13-23 13Z" fill="#c6b992"/>
    {Array.from({ length: built }, (_, i) => <g key={i} transform={`translate(0 ${-i * 10})`}><path d="m189 110 22 12 21-11v-10l-21-12-22 11Z" fill="#eed6b0"/><path d="m211 122 21-11v-10l-21 11Z" fill="#cba77f"/><path d="m194 103 5 3v6l-5-3m11 4 4 2v6l-4-2" fill="#ffe594"/></g>)}
    {built < total ? <g fill="none"><path d="m189 110 0-35 22-12 21 12v36m-43-36 22 12 21-12m-21 12v35" stroke="#f4f3dc" strokeDasharray="3 3"/><path d="M242 113V55l-43-24m43 29 15-9M215 40v21" stroke="#ffd263" strokeWidth="2.5"/></g> : <path d={`m185 ${101-built*10} 25-21 27 16-4 5-22-11-22 15Z`} fill="#de784f"/>}
    {[[104,81],[131,60],[202,53],[260,88],[216,123],[167,123],[181,93]].map(([x,y],i)=><g key={i}><path d={`M${x} ${y}v9`} stroke="#8e7452" strokeWidth="2"/><circle cx={x} cy={y} r={i===6?9:4.5} fill={i%2?"#4fa575":"#69b776"}/></g>)}
    {Array.from({length:total},(_,i)=><path key={i} d={`m${268+i*18} ${117+i*10} -4 7`} stroke={i<built?"#8cf1cd":"#ffd263"} strokeWidth="5"/>)}
  </svg>;
}
