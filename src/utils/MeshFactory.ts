import * as THREE from 'three';
import { createAircraftMaterials } from './MaterialFactory';

export function createAircraftMesh(type: string): THREE.Group {
  const aircraft = new THREE.Group();
  aircraft.name = `aircraft_${type}`;
  
  // Get faction-based materials
  const faction = getFactionForAircraftType(type);
  const materials = createAircraftMaterials(faction);
  
  // Create simplified, cartoon-style aircraft geometry
  switch (type) {
    case 'spitfire':
      createSpitfireMesh(aircraft, materials);
      break;
    case 'bf109':
      createBf109Mesh(aircraft, materials);
      break;
    case 'p51mustang':
      createP51Mesh(aircraft, materials);
      break;
    case 'zero':
      createZeroMesh(aircraft, materials);
      break;
    default:
      createGenericFighterMesh(aircraft, materials);
  }
  
  // Add shadow casting
  aircraft.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  return aircraft;
}

function getFactionForAircraftType(type: string): 'allies' | 'axis' | 'neutral' {
  const factionMap: Record<string, 'allies' | 'axis' | 'neutral'> = {
    spitfire: 'allies',
    p51mustang: 'allies',
    bf109: 'axis',
    zero: 'axis',
  };
  return factionMap[type] || 'neutral';
}

function createSpitfireMesh(aircraft: THREE.Group, materials: any): void {
  // Fuselage - elongated ellipsoid
  const fuselageGeometry = new THREE.CapsuleGeometry(0.8, 6, 8, 16);
  const fuselage = new THREE.Mesh(fuselageGeometry, materials.fuselage);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.name = 'fuselage';
  aircraft.add(fuselage);
  
  // Wings - distinctive elliptical shape
  const wingGeometry = new THREE.BoxGeometry(12, 0.2, 2);
  wingGeometry.translate(0, -0.5, 0);
  
  // Apply wing taper
  const positions = wingGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const taper = 1 - Math.abs(x) / 6 * 0.5;
    positions.setZ(i, z * taper);
  }
  positions.needsUpdate = true;
  
  const wings = new THREE.Mesh(wingGeometry, materials.wing);
  wings.name = 'wings';
  aircraft.add(wings);
  
  // Cockpit
  const cockpitGeometry = new THREE.SphereGeometry(0.6, 8, 6, 0, Math.PI);
  const cockpit = new THREE.Mesh(cockpitGeometry, materials.cockpit);
  cockpit.position.set(0, 0.6, -1);
  cockpit.rotation.z = Math.PI;
  cockpit.name = 'cockpit';
  aircraft.add(cockpit);
  
  // Tail
  const tailGroup = new THREE.Group();
  tailGroup.name = 'tail';
  
  // Vertical stabilizer
  const vStabGeometry = new THREE.BoxGeometry(0.1, 2, 1);
  const vStab = new THREE.Mesh(vStabGeometry, materials.wing);
  vStab.position.set(0, 1, -3.5);
  tailGroup.add(vStab);
  
  // Horizontal stabilizer
  const hStabGeometry = new THREE.BoxGeometry(3, 0.1, 1);
  const hStab = new THREE.Mesh(hStabGeometry, materials.wing);
  hStab.position.set(0, 0.5, -3.5);
  tailGroup.add(hStab);
  
  aircraft.add(tailGroup);
  
  // Propeller
  const propellerGroup = new THREE.Group();
  propellerGroup.name = 'propeller';
  
  const bladeGeometry = new THREE.BoxGeometry(0.2, 3, 0.3);
  const blade1 = new THREE.Mesh(bladeGeometry, materials.detail);
  const blade2 = new THREE.Mesh(bladeGeometry, materials.detail);
  blade2.rotation.z = Math.PI / 2;
  
  propellerGroup.add(blade1, blade2);
  propellerGroup.position.set(0, 0, 3.5);
  aircraft.add(propellerGroup);
  
  // Engine cowling
  const cowlingGeometry = new THREE.ConeGeometry(0.9, 1.5, 8);
  const cowling = new THREE.Mesh(cowlingGeometry, materials.fuselage);
  cowling.rotation.x = -Math.PI / 2;
  cowling.position.set(0, 0, 3);
  aircraft.add(cowling);
}

function createBf109Mesh(aircraft: THREE.Group, materials: any): void {
  // Similar to Spitfire but with angular features
  
  // Fuselage - more angular
  const fuselageGeometry = new THREE.CylinderGeometry(0.6, 0.8, 6, 6);
  const fuselage = new THREE.Mesh(fuselageGeometry, materials.fuselage);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.name = 'fuselage';
  aircraft.add(fuselage);
  
  // Wings - straight with slight taper
  const wingGeometry = new THREE.BoxGeometry(10, 0.2, 2);
  const wings = new THREE.Mesh(wingGeometry, materials.wing);
  wings.name = 'wings';
  aircraft.add(wings);
  
  // Cockpit - more angular canopy
  const cockpitGeometry = new THREE.BoxGeometry(0.8, 0.8, 1.5);
  const cockpit = new THREE.Mesh(cockpitGeometry, materials.cockpit);
  cockpit.position.set(0, 0.6, -0.5);
  cockpit.name = 'cockpit';
  aircraft.add(cockpit);
  
  // Add remaining components similar to Spitfire...
  // (Simplified for brevity)
  
  // Propeller
  const propellerGroup = new THREE.Group();
  propellerGroup.name = 'propeller';
  
  const bladeGeometry = new THREE.BoxGeometry(0.2, 3, 0.3);
  const blade1 = new THREE.Mesh(bladeGeometry, materials.detail);
  const blade2 = new THREE.Mesh(bladeGeometry, materials.detail);
  blade2.rotation.z = Math.PI / 2;
  
  propellerGroup.add(blade1, blade2);
  propellerGroup.position.set(0, 0, 3.5);
  aircraft.add(propellerGroup);
}

function createP51Mesh(aircraft: THREE.Group, materials: any): void {
  // P-51 specific geometry
  createGenericFighterMesh(aircraft, materials);
  // TODO: Add P-51 specific details
}

function createZeroMesh(aircraft: THREE.Group, materials: any): void {
  // Zero specific geometry
  createGenericFighterMesh(aircraft, materials);
  // TODO: Add Zero specific details
}

function createGenericFighterMesh(aircraft: THREE.Group, materials: any): void {
  // Generic fighter plane for placeholder
  
  // Fuselage
  const fuselageGeometry = new THREE.CapsuleGeometry(0.7, 5, 6, 12);
  const fuselage = new THREE.Mesh(fuselageGeometry, materials.fuselage);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.name = 'fuselage';
  aircraft.add(fuselage);
  
  // Wings
  const wingGeometry = new THREE.BoxGeometry(10, 0.2, 2);
  const wings = new THREE.Mesh(wingGeometry, materials.wing);
  wings.name = 'wings';
  aircraft.add(wings);
  
  // Cockpit
  const cockpitGeometry = new THREE.SphereGeometry(0.5, 6, 4, 0, Math.PI);
  const cockpit = new THREE.Mesh(cockpitGeometry, materials.cockpit);
  cockpit.position.set(0, 0.5, -0.5);
  cockpit.rotation.z = Math.PI;
  cockpit.name = 'cockpit';
  aircraft.add(cockpit);
  
  // Tail
  const vStabGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.8);
  const vStab = new THREE.Mesh(vStabGeometry, materials.wing);
  vStab.position.set(0, 0.75, -3);
  aircraft.add(vStab);
  
  const hStabGeometry = new THREE.BoxGeometry(2.5, 0.1, 0.8);
  const hStab = new THREE.Mesh(hStabGeometry, materials.wing);
  hStab.position.set(0, 0.3, -3);
  aircraft.add(hStab);
  
  // Propeller
  const propellerGroup = new THREE.Group();
  propellerGroup.name = 'propeller';
  
  const bladeGeometry = new THREE.BoxGeometry(0.15, 2.5, 0.2);
  const blade1 = new THREE.Mesh(bladeGeometry, materials.detail);
  const blade2 = new THREE.Mesh(bladeGeometry, materials.detail);
  blade2.rotation.z = Math.PI / 2;
  
  propellerGroup.add(blade1, blade2);
  propellerGroup.position.set(0, 0, 3);
  aircraft.add(propellerGroup);
  
  // Nose cone
  const noseGeometry = new THREE.ConeGeometry(0.7, 1.2, 6);
  const nose = new THREE.Mesh(noseGeometry, materials.fuselage);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, 2.5);
  aircraft.add(nose);
}

// Utility function to create simple particle effects
export function createSmokeParticle(): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  
  for (let i = 0; i < 50; i++) {
    vertices.push(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0x888888,
    size: 0.5,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });
  
  return new THREE.Points(geometry, material);
}