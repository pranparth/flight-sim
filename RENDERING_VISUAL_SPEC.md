# 3D Rendering & Cartoon Visual Style - Technical Specification

## Visual Direction
The game employs a stylized cartoon aesthetic reminiscent of animated WW2 propaganda posters and vintage comics, with bold colors, simplified geometry, and exaggerated effects.

## Rendering Pipeline

### Core Renderer Setup
```typescript
class CartoonRenderer {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    
    // Enable required extensions
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Setup post-processing pipeline
    this.setupPostProcessing();
  }
  
  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);
    
    // Outline pass for important objects
    const outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      scene,
      camera
    );
    this.composer.addPass(outlinePass);
    
    // Custom cel-shading pass
    const celShadingPass = new ShaderPass(CelShadingShader);
    this.composer.addPass(celShadingPass);
    
    // FXAA for smooth edges
    const fxaaPass = new ShaderPass(FXAAShader);
    this.composer.addPass(fxaaPass);
  }
}
```

## Cel-Shading Implementation

### Custom Toon Shader
```glsl
// Vertex Shader
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}

// Fragment Shader
uniform vec3 uBaseColor;
uniform vec3 uLightDirection;
uniform sampler2D uRampTexture;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Calculate basic lighting
  float NdotL = dot(normalize(vNormal), normalize(uLightDirection));
  float lightIntensity = NdotL * 0.5 + 0.5; // Remap to 0-1
  
  // Sample gradient ramp for cel-shading
  vec3 shadedColor = texture2D(uRampTexture, vec2(lightIntensity, 0.5)).rgb;
  
  // Apply base color
  vec3 finalColor = uBaseColor * shadedColor;
  
  // Rim lighting for cartoon effect
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
  rim = smoothstep(0.6, 1.0, rim);
  finalColor += vec3(rim) * 0.2;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
```

### Gradient Ramp System
```typescript
class ToonRampGenerator {
  static createRamp(colors: string[], steps: number): THREE.DataTexture {
    const width = steps;
    const height = 1;
    const data = new Uint8Array(width * height * 4);
    
    // Create stepped gradient
    for (let i = 0; i < width; i++) {
      const colorIndex = Math.floor((i / width) * colors.length);
      const color = new THREE.Color(colors[colorIndex]);
      
      const idx = i * 4;
      data[idx] = color.r * 255;
      data[idx + 1] = color.g * 255;
      data[idx + 2] = color.b * 255;
      data[idx + 3] = 255;
    }
    
    const texture = new THREE.DataTexture(data, width, height);
    texture.needsUpdate = true;
    return texture;
  }
}

// Faction-specific color ramps
const FACTION_RAMPS = {
  allies: ['#1a3d5c', '#2d5a87', '#4a7bb0', '#6fa3d2'],
  axis: ['#3d1a1a', '#5c2d2d', '#874a4a', '#b06f6f'],
  neutral: ['#3d3d1a', '#5c5c2d', '#87874a', '#b0b06f']
};
```

## Aircraft Models

### Low-Poly Modeling Guidelines
```typescript
interface ModelLOD {
  distance: number;
  vertexCount: number;
  textureSize: number;
}

const AIRCRAFT_LODS: ModelLOD[] = [
  { distance: 0, vertexCount: 3000, textureSize: 1024 },    // LOD0 - Close
  { distance: 100, vertexCount: 1500, textureSize: 512 },   // LOD1 - Medium
  { distance: 300, vertexCount: 500, textureSize: 256 },    // LOD2 - Far
  { distance: 1000, vertexCount: 100, textureSize: 128 }    // LOD3 - Very far
];
```

### Stylized Geometry Features
1. **Simplified Shapes**: Smooth, rounded forms
2. **Exaggerated Proportions**: Larger cockpits, stubbier wings
3. **Clean Edges**: No small details or panel lines
4. **Iconic Silhouettes**: Instantly recognizable aircraft profiles

## Visual Effects

### Particle Systems
```typescript
class CartoonParticleSystem {
  // Stylized smoke trails
  createSmokeTrail(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(100 * 3);
    const sizes = new Float32Array(100);
    const alphas = new Float32Array(100);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.loadSmokeTexture() },
        uColor: { value: new THREE.Color(0x888888) }
      },
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });
    
    return new THREE.Points(geometry, material);
  }
  
  // Cartoon explosions with rings
  createExplosion(position: THREE.Vector3): void {
    // Central flash
    const flash = this.createFlashSphere(position);
    
    // Expanding rings
    for (let i = 0; i < 3; i++) {
      const ring = this.createShockwaveRing(position, i * 0.1);
      scene.add(ring);
    }
    
    // Debris particles
    const debris = this.createDebrisParticles(position, 20);
    scene.add(debris);
  }
}
```

### Stylized Environmental Effects
```typescript
class EnvironmentEffects {
  // Cartoon clouds using metaballs
  generateCloudLayer(altitude: number): THREE.Mesh {
    const cloudShader = {
      uniforms: {
        uTime: { value: 0 },
        uDensity: { value: 0.5 },
        uSpeed: { value: 0.1 }
      },
      vertexShader: CLOUD_VERTEX_SHADER,
      fragmentShader: CLOUD_FRAGMENT_SHADER
    };
    
    const geometry = new THREE.PlaneGeometry(5000, 5000, 100, 100);
    const material = new THREE.ShaderMaterial(cloudShader);
    
    const cloudMesh = new THREE.Mesh(geometry, material);
    cloudMesh.position.y = altitude;
    cloudMesh.rotation.x = -Math.PI / 2;
    
    return cloudMesh;
  }
  
  // Stylized ocean with foam
  createOceanSurface(): THREE.Mesh {
    const oceanShader = {
      uniforms: {
        uTime: { value: 0 },
        uWaveHeight: { value: 2.0 },
        uWaveFrequency: { value: 0.1 },
        uFoamThreshold: { value: 0.7 },
        uDeepColor: { value: new THREE.Color(0x006994) },
        uShallowColor: { value: new THREE.Color(0x00a9d4) },
        uFoamColor: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: OCEAN_VERTEX_SHADER,
      fragmentShader: OCEAN_FRAGMENT_SHADER
    };
    
    return new THREE.Mesh(
      new THREE.PlaneGeometry(10000, 10000, 200, 200),
      new THREE.ShaderMaterial(oceanShader)
    );
  }
}
```

## Lighting System

### Three-Point Cartoon Lighting
```typescript
class CartoonLighting {
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  
  constructor() {
    // Key light - main directional light with shadows
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.keyLight.position.set(50, 100, 50);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    
    // Stylized shadow settings
    this.keyLight.shadow.radius = 4;
    this.keyLight.shadow.blurSamples = 25;
    
    // Fill light - soft ambient lighting
    this.fillLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.6);
    
    // Rim light - back lighting for silhouettes
    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    this.rimLight.position.set(-50, 50, -50);
  }
  
  // Time of day presets
  setTimeOfDay(preset: 'dawn' | 'noon' | 'dusk' | 'night'): void {
    const presets = {
      dawn: {
        keyColor: 0xffaa77,
        keyIntensity: 0.8,
        skyColor: 0xff8866,
        groundColor: 0x443333
      },
      noon: {
        keyColor: 0xffffff,
        keyIntensity: 1.2,
        skyColor: 0x87ceeb,
        groundColor: 0x8b7355
      },
      dusk: {
        keyColor: 0xff7744,
        keyIntensity: 0.6,
        skyColor: 0xff6644,
        groundColor: 0x332222
      },
      night: {
        keyColor: 0x4466aa,
        keyIntensity: 0.3,
        skyColor: 0x112244,
        groundColor: 0x111122
      }
    };
    
    const settings = presets[preset];
    this.keyLight.color.setHex(settings.keyColor);
    this.keyLight.intensity = settings.keyIntensity;
    this.fillLight.color.setHex(settings.skyColor);
    this.fillLight.groundColor.setHex(settings.groundColor);
  }
}
```

## UI Visual Elements

### HUD Rendering
```typescript
class CartoonHUD {
  private canvas2D: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  
  renderHUD(data: HUDData): void {
    this.ctx.clearRect(0, 0, this.canvas2D.width, this.canvas2D.height);
    
    // Stylized instrument panel
    this.drawArtificialHorizon(data.pitch, data.roll);
    this.drawSpeedometer(data.speed);
    this.drawAltimeter(data.altitude);
    
    // Cartoon-style indicators
    this.drawHealthBar(data.health);
    this.drawAmmoCounter(data.ammo);
    
    this.texture.needsUpdate = true;
  }
  
  private drawArtificialHorizon(pitch: number, roll: number): void {
    const centerX = 150;
    const centerY = 150;
    const radius = 100;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(-roll);
    
    // Sky (blue gradient)
    const skyGradient = this.ctx.createLinearGradient(0, -radius, 0, 0);
    skyGradient.addColorStop(0, '#4a90e2');
    skyGradient.addColorStop(1, '#87ceeb');
    
    // Ground (brown gradient)
    const groundGradient = this.ctx.createLinearGradient(0, 0, 0, radius);
    groundGradient.addColorStop(0, '#8b7355');
    groundGradient.addColorStop(1, '#654321');
    
    // Draw with pitch offset
    const pitchOffset = pitch * 2;
    
    // Clip to circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.clip();
    
    // Draw sky
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(-radius, -radius + pitchOffset, radius * 2, radius);
    
    // Draw ground
    this.ctx.fillStyle = groundGradient;
    this.ctx.fillRect(-radius, pitchOffset, radius * 2, radius);
    
    this.ctx.restore();
    
    // Draw stylized frame
    this.drawInstrumentFrame(centerX, centerY, radius);
  }
}
```

## Performance Optimizations

### Dynamic Quality Settings
```typescript
class QualityManager {
  private settings: QualitySettings = {
    shadowQuality: 'medium',
    particleDensity: 1.0,
    postProcessing: true,
    terrainLODBias: 0,
    effectsQuality: 'high'
  };
  
  adjustQualityBasedOnFPS(currentFPS: number): void {
    if (currentFPS < 30) {
      this.decreaseQuality();
    } else if (currentFPS > 55) {
      this.increaseQuality();
    }
  }
  
  private decreaseQuality(): void {
    // Reduce shadows first
    if (this.settings.shadowQuality === 'high') {
      this.settings.shadowQuality = 'medium';
      this.updateShadowMap(1024);
    } else if (this.settings.shadowQuality === 'medium') {
      this.settings.shadowQuality = 'low';
      this.updateShadowMap(512);
    }
    
    // Then particles
    this.settings.particleDensity = Math.max(0.25, this.settings.particleDensity - 0.25);
    
    // Finally post-processing
    if (this.settings.postProcessing) {
      this.settings.postProcessing = false;
    }
  }
}
```

### Instanced Rendering for Multiple Aircraft
```typescript
class InstancedAircraftRenderer {
  private instancedMesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D = new THREE.Object3D();
  
  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  
  updateInstances(aircraft: Aircraft[]): void {
    for (let i = 0; i < aircraft.length; i++) {
      this.dummy.position.copy(aircraft[i].position);
      this.dummy.quaternion.copy(aircraft[i].rotation);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
```