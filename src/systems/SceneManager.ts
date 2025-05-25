import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Aircraft } from '@entities/Aircraft';
import { createToonMaterial } from '@utils/MaterialFactory';

export class SceneManager {
  private scene: THREE.Scene;
  private skybox?: Sky;
  // private _terrain?: THREE.Mesh;
  private ocean?: THREE.Mesh;
  private aircraft: Aircraft[] = [];
  
  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 500, 5000);
  }
  
  async init(): Promise<void> {
    this.setupLighting();
    this.setupEnvironment();
    await this.loadAssets();
  }
  
  private setupLighting(): void {
    // Key light - main directional light with shadows
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.keyLight.position.set(50, 100, 50);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 500;
    this.keyLight.shadow.camera.left = -100;
    this.keyLight.shadow.camera.right = 100;
    this.keyLight.shadow.camera.top = 100;
    this.keyLight.shadow.camera.bottom = -100;
    this.keyLight.shadow.radius = 4;
    this.keyLight.shadow.blurSamples = 25;
    this.scene.add(this.keyLight);
    
    // Fill light - soft ambient lighting
    this.fillLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.6);
    this.scene.add(this.fillLight);
    
    // Rim light - back lighting for silhouettes
    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    this.rimLight.position.set(-50, 50, -50);
    this.scene.add(this.rimLight);
    
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambient);
  }
  
  private setupEnvironment(): void {
    // Create skybox
    this.createSkybox();
    
    // Create ocean
    this.createOcean();
    
    // Create simple terrain islands
    this.createTerrain();
  }
  
  private createSkybox(): void {
    this.skybox = new Sky();
    this.skybox.scale.setScalar(10000);
    this.scene.add(this.skybox);
    
    const skyUniforms = this.skybox.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    
    // Position sun
    const sun = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - 30);
    const theta = THREE.MathUtils.degToRad(180);
    sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sun);
  }
  
  private createOcean(): void {
    // Create ground plane first
    const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x3a5f3a, // Dark green color
      emissive: 0x1a2f1a,
      specular: 0x000000,
      shininess: 0,
      flatShading: true,
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1; // Slightly below y=0 to prevent z-fighting
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Create ocean on top
    const oceanGeometry = new THREE.PlaneGeometry(10000, 10000, 100, 100);
    
    // Simple ocean material with cartoon style
    const oceanMaterial = new THREE.MeshPhongMaterial({
      color: 0x006994,
      specular: 0x00a9d4,
      shininess: 100,
      flatShading: false,
    });
    
    this.ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = 0;
    this.ocean.receiveShadow = true;
    this.scene.add(this.ocean);
    
    // Add some basic wave animation
    this.ocean.userData.originalPositions = oceanGeometry.attributes.position.array.slice();
  }
  
  private createTerrain(): void {
    // Create rolling hills using a custom geometry
    this.createHills();
    
    // Add buildings
    this.createBuildings();
    
    // Add trees
    this.createTrees();
    
    // Keep some islands for variety
    const islandGeometry = new THREE.ConeGeometry(200, 50, 8, 1);
    const islandMaterial = createToonMaterial({
      color: 0x3d5c3d,
      emissive: 0x1a2a1a,
      steps: 4,
    });
    
    const island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.position.set(2500, -25, 2500);
    island.castShadow = true;
    island.receiveShadow = true;
    this.scene.add(island);
  }
  
  private createHills(): void {
    // Create rolling hills using multiple scaled spheres
    const hillMaterial = createToonMaterial({
      color: 0x4a6741,
      emissive: 0x1a2a1a,
      steps: 3,
    });
    
    // Main hill range
    for (let i = 0; i < 8; i++) {
      const size = 200 + Math.random() * 300;
      const hillGeometry = new THREE.SphereGeometry(size, 16, 12);
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      
      const angle = (i / 8) * Math.PI * 2;
      const distance = 1000 + Math.random() * 1500;
      hill.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      hill.scale.y = 0.4 + Math.random() * 0.3;
      hill.castShadow = true;
      hill.receiveShadow = true;
      this.scene.add(hill);
    }
    
    // Distant mountains
    const mountainMaterial = createToonMaterial({
      color: 0x5a6a5a,
      emissive: 0x2a2a2a,
      steps: 2,
    });
    
    for (let i = 0; i < 5; i++) {
      const mountainGeometry = new THREE.ConeGeometry(600 + Math.random() * 400, 400 + Math.random() * 200, 8, 1);
      const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
      
      const angle = (i / 5) * Math.PI * 2;
      const distance = 3000 + Math.random() * 1000;
      mountain.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      mountain.rotation.y = Math.random() * Math.PI * 2;
      mountain.castShadow = true;
      mountain.receiveShadow = true;
      this.scene.add(mountain);
    }
  }
  
  private createBuildings(): void {
    // Town area with various buildings
    const buildingMaterials = [
      createToonMaterial({ color: 0x8b4513, emissive: 0x4a2a0a, steps: 3 }), // Brown
      createToonMaterial({ color: 0x696969, emissive: 0x2a2a2a, steps: 3 }), // Gray
      createToonMaterial({ color: 0xb87333, emissive: 0x5a3a1a, steps: 3 }), // Copper
    ];
    
    // Create a small town
    const townCenter = new THREE.Vector3(800, 0, -800);
    const buildingCount = 25;
    
    for (let i = 0; i < buildingCount; i++) {
      const width = 40 + Math.random() * 60;
      const height = 60 + Math.random() * 140;
      const depth = 40 + Math.random() * 60;
      
      const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
      const material = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
      const building = new THREE.Mesh(buildingGeometry, material);
      
      // Position buildings in a rough grid with some randomness
      const gridX = (i % 5) - 2;
      const gridZ = Math.floor(i / 5) - 2;
      
      building.position.set(
        townCenter.x + gridX * 150 + (Math.random() - 0.5) * 50,
        height / 2,
        townCenter.z + gridZ * 150 + (Math.random() - 0.5) * 50
      );
      
      building.rotation.y = Math.random() * 0.2 - 0.1;
      building.castShadow = true;
      building.receiveShadow = true;
      
      // Add simple roof
      const roofGeometry = new THREE.ConeGeometry(width * 0.8, height * 0.3, 4);
      const roofMaterial = createToonMaterial({ color: 0x8b0000, emissive: 0x4a0000, steps: 2 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = height / 2 + height * 0.15;
      roof.rotation.y = Math.PI / 4;
      building.add(roof);
      
      this.scene.add(building);
    }
    
    // Add some industrial buildings near the coast
    const hangarGeometry = new THREE.BoxGeometry(200, 80, 300);
    const hangarMaterial = createToonMaterial({ color: 0x404040, emissive: 0x202020, steps: 2 });
    
    for (let i = 0; i < 3; i++) {
      const hangar = new THREE.Mesh(hangarGeometry, hangarMaterial);
      hangar.position.set(
        -1200 + i * 400,
        40,
        -300
      );
      hangar.castShadow = true;
      hangar.receiveShadow = true;
      
      // Add curved roof
      const roofGeometry = new THREE.CylinderGeometry(150, 150, 300, 16, 1, false, 0, Math.PI);
      const roof = new THREE.Mesh(roofGeometry, hangarMaterial);
      roof.position.y = 80;
      roof.rotation.z = Math.PI / 2;
      hangar.add(roof);
      
      this.scene.add(hangar);
    }
  }
  
  private createTrees(): void {
    const treeTrunkMaterial = createToonMaterial({ color: 0x4a3c28, emissive: 0x2a1c18, steps: 2 });
    const treeLeavesMaterials = [
      createToonMaterial({ color: 0x228b22, emissive: 0x0a4a0a, steps: 3 }),
      createToonMaterial({ color: 0x2e7d32, emissive: 0x0a3a0a, steps: 3 }),
      createToonMaterial({ color: 0x1b5e20, emissive: 0x0a2a0a, steps: 3 }),
    ];
    
    // Forest areas
    const forestAreas = [
      { center: new THREE.Vector3(-1500, 0, 1000), radius: 600, density: 40 },
      { center: new THREE.Vector3(1800, 0, 800), radius: 400, density: 25 },
      { center: new THREE.Vector3(200, 0, -1800), radius: 500, density: 30 },
    ];
    
    forestAreas.forEach(forest => {
      for (let i = 0; i < forest.density; i++) {
        // Random position within forest area
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * forest.radius;
        const x = forest.center.x + Math.cos(angle) * distance;
        const z = forest.center.z + Math.sin(angle) * distance;
        
        // Tree trunk
        const trunkHeight = 30 + Math.random() * 20;
        const trunkGeometry = new THREE.CylinderGeometry(5, 8, trunkHeight, 8);
        const trunk = new THREE.Mesh(trunkGeometry, treeTrunkMaterial);
        trunk.position.set(x, 0, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        
        // Tree leaves (multiple spheres for fuller look)
        const leavesMaterial = treeLeavesMaterials[Math.floor(Math.random() * treeLeavesMaterials.length)];
        const leavesGroup = new THREE.Group();
        
        for (let j = 0; j < 3; j++) {
          const leavesRadius = 25 + Math.random() * 15;
          const leavesGeometry = new THREE.SphereGeometry(leavesRadius, 8, 6);
          const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
          
          leaves.position.set(
            (Math.random() - 0.5) * 20,
            trunkHeight / 2 + j * 10,
            (Math.random() - 0.5) * 20
          );
          
          leaves.scale.set(
            1 + Math.random() * 0.3,
            0.8 + Math.random() * 0.3,
            1 + Math.random() * 0.3
          );
          
          leaves.castShadow = true;
          leaves.receiveShadow = true;
          leavesGroup.add(leaves);
        }
        
        trunk.add(leavesGroup);
        this.scene.add(trunk);
      }
    });
    
    // Scattered individual trees
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 4000;
      const z = (Math.random() - 0.5) * 4000;
      
      // Skip if too close to town or ocean
      if (Math.abs(x - 800) < 500 && Math.abs(z + 800) < 500) continue;
      if (Math.sqrt(x * x + z * z) < 500) continue;
      
      const trunkHeight = 20 + Math.random() * 30;
      const trunkGeometry = new THREE.CylinderGeometry(4, 6, trunkHeight, 6);
      const trunk = new THREE.Mesh(trunkGeometry, treeTrunkMaterial);
      trunk.position.set(x, trunkHeight / 2, z);
      trunk.castShadow = true;
      
      const leavesRadius = 20 + Math.random() * 10;
      const leavesGeometry = new THREE.ConeGeometry(leavesRadius, leavesRadius * 1.5, 8);
      const leaves = new THREE.Mesh(leavesGeometry, treeLeavesMaterials[0]);
      leaves.position.y = trunkHeight / 2 + leavesRadius * 0.5;
      leaves.castShadow = true;
      
      trunk.add(leaves);
      this.scene.add(trunk);
    }
  }
  
  private async loadAssets(): Promise<void> {
    // Asset loading will be implemented later
    // For now, we'll use procedural geometry
  }
  
  update(deltaTime: number, elapsedTime: number): void {
    // Update ocean waves
    if (this.ocean) {
      const positions = this.ocean.geometry.attributes.position;
      const originalPositions = this.ocean.userData.originalPositions;
      
      for (let i = 0; i < positions.count; i++) {
        const x = originalPositions[i * 3];
        const z = originalPositions[i * 3 + 2];
        
        // Simple wave function
        const waveHeight = Math.sin(x * 0.01 + elapsedTime) * 
                          Math.cos(z * 0.01 + elapsedTime * 0.8) * 2;
        
        positions.setY(i, waveHeight);
      }
      
      positions.needsUpdate = true;
      this.ocean.geometry.computeVertexNormals();
    }
    
    // Update aircraft
    this.aircraft.forEach(aircraft => {
      aircraft.update(deltaTime);
    });
  }
  
  addAircraft(aircraft: Aircraft): void {
    this.aircraft.push(aircraft);
    this.scene.add(aircraft.getMesh());
  }
  
  removeAircraft(aircraft: Aircraft): void {
    const index = this.aircraft.indexOf(aircraft);
    if (index > -1) {
      this.aircraft.splice(index, 1);
      this.scene.remove(aircraft.getMesh());
    }
  }
  
  getScene(): THREE.Scene {
    return this.scene;
  }
  
  setTimeOfDay(preset: 'dawn' | 'noon' | 'dusk' | 'night'): void {
    const presets = {
      dawn: {
        keyColor: 0xffaa77,
        keyIntensity: 0.8,
        skyColor: 0xff8866,
        groundColor: 0x443333,
        fogColor: 0xffaa77,
        sunElevation: 10,
      },
      noon: {
        keyColor: 0xffffff,
        keyIntensity: 1.2,
        skyColor: 0x87ceeb,
        groundColor: 0x8b7355,
        fogColor: 0x87ceeb,
        sunElevation: 60,
      },
      dusk: {
        keyColor: 0xff7744,
        keyIntensity: 0.6,
        skyColor: 0xff6644,
        groundColor: 0x332222,
        fogColor: 0xff7744,
        sunElevation: 5,
      },
      night: {
        keyColor: 0x4466aa,
        keyIntensity: 0.3,
        skyColor: 0x112244,
        groundColor: 0x111122,
        fogColor: 0x112244,
        sunElevation: -10,
      },
    };
    
    const settings = presets[preset];
    
    // Update lights
    this.keyLight.color.setHex(settings.keyColor);
    this.keyLight.intensity = settings.keyIntensity;
    this.fillLight.color.setHex(settings.skyColor);
    this.fillLight.groundColor.setHex(settings.groundColor);
    
    // Update fog
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(settings.fogColor);
    }
    
    // Update sun position
    if (this.skybox) {
      const phi = THREE.MathUtils.degToRad(90 - settings.sunElevation);
      const theta = THREE.MathUtils.degToRad(180);
      const sun = new THREE.Vector3();
      sun.setFromSphericalCoords(1, phi, theta);
      this.skybox.material.uniforms['sunPosition'].value.copy(sun);
    }
  }
}