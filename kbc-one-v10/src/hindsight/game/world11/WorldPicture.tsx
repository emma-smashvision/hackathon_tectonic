import picture from './world-picture.jpg';
/** Generic scene postcard. No personal data, labels or live Canvas on Home. */
export function WorldPicture({className=''}:{className?:string}){return <img className={className} src={picture.src} width={picture.width} height={picture.height} alt="A blue-hour island with illuminated neighbourhoods around a central plaza" draggable={false} style={{display:'block',width:'100%',height:'100%',objectFit:'cover'}}/>;}
