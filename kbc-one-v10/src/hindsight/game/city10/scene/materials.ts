import * as THREE from 'three';
export function facadeMaterial(windowIntensity=1,windowTint?:string) {
  const material=new THREE.MeshStandardMaterial({color:'#1c344a',metalness:.7,roughness:.29});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFacadePosition; varying vec3 vFacadeNormal;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 fp=vec4(position,1.0);
      #ifdef USE_INSTANCING
      fp=instanceMatrix*fp;
      #endif
      vFacadePosition=(modelMatrix*fp).xyz;
      vFacadeNormal=objectNormal;
      #ifdef USE_INSTANCING
      vFacadeNormal=mat3(instanceMatrix)*objectNormal;
      #endif
      vFacadeNormal=normalize(mat3(modelMatrix)*vFacadeNormal);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFacadePosition; varying vec3 vFacadeNormal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec2 horizontal=normalize(vec2(vFacadeNormal.z,-vFacadeNormal.x)+vec2(.0001));
      vec2 face=vec2(dot(vFacadePosition.xz,horizontal),vFacadePosition.y);
      vec2 cell=floor(face/vec2(2.1,2.65));
      vec2 uv=fract(face/vec2(2.1,2.65));
      float seed=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);
      float windowMask=step(.15,uv.x)*step(uv.x,.78)*step(.36,uv.y)*step(uv.y,.68)*(1.-step(.5,abs(vFacadeNormal.y)));
      float on=step(.48,seed);
      vec3 warm=${windowTint?`vec3(${new THREE.Color(windowTint).r.toFixed(3)},${new THREE.Color(windowTint).g.toFixed(3)},${new THREE.Color(windowTint).b.toFixed(3)})`:'mix(vec3(.12,.38,.54),vec3(.8,.48,.20),step(.78,seed))'};
      totalEmissiveRadiance+=warm*windowMask*on*(.42+seed*.65)*${windowIntensity.toFixed(2)};
      diffuseColor.rgb*=mix(.6,1.2,windowMask);`);
  };
  material.customProgramCacheKey=()=> `city10-window-grid-v1-${windowIntensity}-${windowTint}`;
  return material;
}
export function roadMaterial() {
  const material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide,color:'#385063',metalness:.35,roughness:.45,transparent:true,opacity:.58,depthWrite:false});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRoadPos;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 rp=vec4(position,1.0);
      #ifdef USE_INSTANCING
      rp=instanceMatrix*rp;
      #endif
      vRoadPos=(modelMatrix*rp).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRoadPos;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float grain=fract(sin(dot(vRoadPos.xz*60.,vec2(12.9898,78.233)))*43758.5453);
      float puddle=sin(vRoadPos.x*.12+sin(vRoadPos.z*.3))*sin(vRoadPos.z*.18);
      roughnessFactor=.38+grain*.08+smoothstep(-.2,.8,puddle)*.14;
      diffuseColor.rgb*=.98+grain*.03;`);
  };
  material.customProgramCacheKey=()=> 'city10-wet-asphalt-v1';return material;
}
export function glowMaterial(opacity=1) { return new THREE.MeshBasicMaterial({color:new THREE.Color(1.8,1.8,1.8),toneMapped:false,transparent:opacity<1,opacity,depthWrite:opacity===1}); }

/** A baked radial pool makes a lamp/storefront illuminate the pavement without a shadow pass. */
export function lightPoolMaterial(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.2)');gradient.addColorStop(.35,'rgba(255,255,255,.09)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const map=new THREE.CanvasTexture(canvas);return new THREE.MeshBasicMaterial({map,color:'#ffffff',transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
}
