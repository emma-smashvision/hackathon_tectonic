"use client";
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { Batch } from '../city10/scene/Batch';
import type { BoxInstance } from '../city10/scene/art';
/** Reuse v10 instancing and opt opaque architecture into the island's single shadow map. */
export function WorldBatch({items,material}:{items:BoxInstance[];material:THREE.Material}){const group=useRef<THREE.Group>(null);useLayoutEffect(()=>{group.current?.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=!(material instanceof THREE.MeshBasicMaterial);o.receiveShadow=true;}});},[items,material]);return <group ref={group}><Batch items={items} material={material}/></group>;}
