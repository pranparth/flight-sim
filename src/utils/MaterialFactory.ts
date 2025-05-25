import * as THREE from 'three';

export interface ToonMaterialOptions {
  color: number | string;
  emissive?: number | string;
  steps?: number;
  specular?: number | string;
  shininess?: number;
}

// Gradient ramps for different lighting styles
const RAMP_TEXTURES: Map<number, THREE.DataTexture> = new Map();

function createRampTexture(steps: number): THREE.DataTexture {
  if (RAMP_TEXTURES.has(steps)) {
    return RAMP_TEXTURES.get(steps)!;
  }
  
  const width = 256;
  const height = 1;
  const data = new Uint8Array(width * height * 4);
  
  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const step = Math.floor(t * steps) / steps;
    const value = step * 255;
    
    const idx = i * 4;
    data[idx] = value;
    data[idx + 1] = value;
    data[idx + 2] = value;
    data[idx + 3] = 255;
  }
  
  const texture = new THREE.DataTexture(data, width, height);
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  
  RAMP_TEXTURES.set(steps, texture);
  return texture;
}

export function createToonMaterial(options: ToonMaterialOptions): THREE.MeshToonMaterial {
  const steps = options.steps || 4;
  const rampTexture = createRampTexture(steps);
  
  const material = new THREE.MeshToonMaterial({
    color: new THREE.Color(options.color),
    emissive: options.emissive ? new THREE.Color(options.emissive) : undefined,
    emissiveIntensity: 0.2,
    gradientMap: rampTexture,
  });
  
  return material;
}

export function createOutlineMaterial(color: number | string = 0x000000, thickness: number = 0.03): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      outlineColor: { value: new THREE.Color(color) },
      outlineThickness: { value: thickness }
    },
    vertexShader: `
      uniform float outlineThickness;
      void main() {
        vec4 pos = modelViewMatrix * vec4(position, 1.0);
        vec3 normal = normalize(normalMatrix * normal);
        pos.xyz += normal * outlineThickness;
        gl_Position = projectionMatrix * pos;
      }
    `,
    fragmentShader: `
      uniform vec3 outlineColor;
      void main() {
        gl_FragColor = vec4(outlineColor, 1.0);
      }
    `,
    side: THREE.BackSide
  });
}

// Faction color schemes
export const FACTION_COLORS = {
  allies: {
    primary: 0x2d5016,     // Dark green for fuselage
    secondary: 0x3a6b1f,   // Medium green for wings
    accent: 0xffd700,      // Yellow for markings
    cockpit: 0x333333,
  },
  axis: {
    primary: 0x3d1a1a,
    secondary: 0x874a4a,
    accent: 0xff0000,
    cockpit: 0x333333,
  },
  neutral: {
    primary: 0x3d3d1a,
    secondary: 0x87874a,
    accent: 0x00ff00,
    cockpit: 0x333333,
  },
};

export function createAircraftMaterials(faction: 'allies' | 'axis' | 'neutral'): {
  fuselage: THREE.Material;
  wing: THREE.Material;
  cockpit: THREE.Material;
  detail: THREE.Material;
} {
  const colors = FACTION_COLORS[faction];
  
  return {
    fuselage: createToonMaterial({
      color: colors.primary,
      emissive: colors.primary,
      steps: 4,
    }),
    wing: createToonMaterial({
      color: colors.secondary,
      emissive: colors.secondary,
      steps: 4,
    }),
    cockpit: new THREE.MeshPhongMaterial({
      color: colors.cockpit,
      specular: 0xffffff,
      shininess: 100,
      transparent: true,
      opacity: 0.8,
    }),
    detail: createToonMaterial({
      color: colors.accent,
      emissive: colors.accent,
      steps: 2,
    }),
  };
}