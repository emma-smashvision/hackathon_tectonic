import type { CSSProperties } from 'react';
import picture from './night-city-preview.jpg';
/** The actual night scene as a small static postcard. Home never mounts a WebGL canvas. */
export function NightCityPicture({className,style}:{className?:string;style?:CSSProperties}){
 return <img src={picture.src} width={960} height={540} alt="" aria-hidden="true" className={className} style={{display:'block',width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 52%',...style}}/>;
}
