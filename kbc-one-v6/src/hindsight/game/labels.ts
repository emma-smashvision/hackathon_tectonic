import * as THREE from "three";

// Canvas textures for the scene. There is deliberately no text texture here:
// every readable word is drawn by the screen-space label layer (hud/WorldLabels.tsx).

/** A hazard-stripe texture for bump zones. */
let stripes: THREE.CanvasTexture | null = null;
export function stripeTexture(): THREE.CanvasTexture {
  if (stripes) return stripes;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#1a1408";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#f3a93c";
  for (let i = -64; i < 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 0);
    ctx.lineTo(i + 16 + 64, 64);
    ctx.lineTo(i + 64, 64);
    ctx.closePath();
    ctx.fill();
  }
  stripes = new THREE.CanvasTexture(c);
  stripes.wrapS = THREE.RepeatWrapping;
  stripes.wrapT = THREE.RepeatWrapping;
  stripes.colorSpace = THREE.SRGBColorSpace;
  return stripes;
}
