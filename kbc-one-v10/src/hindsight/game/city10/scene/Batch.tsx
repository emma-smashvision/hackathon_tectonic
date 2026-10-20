"use client";
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import type { BoxInstance } from './art';
const box = new THREE.BoxGeometry(1,1,1);
/** All static geometry in a batch has one draw call, including facade windows. */
export function Batch({items,material,renderOrder=0}:{items:BoxInstance[];material:THREE.Material;renderOrder?:number}) {
  const ref=useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const obj=new THREE.Object3D(),color=new THREE.Color();items.forEach((v,i)=>{obj.position.set(...v.at);obj.scale.set(...v.size);obj.rotation.set(0,v.rot??0,0);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);mesh.setColorAt(i,color.set(v.color??'#ffffff'));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();},[items]);
  return <instancedMesh ref={ref} args={[box,material,items.length]} count={items.length} renderOrder={renderOrder} frustumCulled={false}/>;
}
