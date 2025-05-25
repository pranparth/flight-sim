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
  // Fuselage - more tapered towards tail, characteristic Spitfire shape
  const fuselageGroup = new THREE.Group();
  fuselageGroup.name = 'fuselage';
  
  // Main fuselage body
  const fuselageGeometry = new THREE.CapsuleGeometry(0.8, 5, 8, 16);
  const fuselage = new THREE.Mesh(fuselageGeometry, materials.fuselage);
  fuselage.rotation.z = Math.PI / 2;
  fuselageGroup.add(fuselage);
  
  // Tail section taper
  const tailTaperGeometry = new THREE.ConeGeometry(0.8, 2, 8);
  const tailTaper = new THREE.Mesh(tailTaperGeometry, materials.fuselage);
  tailTaper.rotation.x = Math.PI / 2;
  tailTaper.position.set(0, 0, -3.5);
  fuselageGroup.add(tailTaper);
  
  aircraft.add(fuselageGroup);
  
  // Wings - distinctive elliptical Spitfire shape
  const wingGroup = new THREE.Group();
  wingGroup.name = 'wings';
  
  // Create elliptical wing shape with more authentic Spitfire proportions
  const wingGeometry = new THREE.BoxGeometry(11, 0.15, 2.5);
  wingGeometry.translate(0, -0.3, 0.2);
  
  // Apply elliptical taper - Spitfire's signature wing shape
  const positions = wingGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const y = positions.getY(i);
    
    // Elliptical planform
    const xNorm = Math.abs(x) / 5.5;
    const ellipticalTaper = Math.sqrt(1 - xNorm * xNorm);
    positions.setZ(i, z * ellipticalTaper);
    
    // Slight dihedral (upward angle)
    if (Math.abs(x) > 0.5) {
      positions.setY(i, y + Math.abs(x) * 0.02);
    }
  }
  positions.needsUpdate = true;
  
  const wings = new THREE.Mesh(wingGeometry, materials.wing);
  wingGroup.add(wings);
  
  // Wing root fairings
  const fairingGeometry = new THREE.CylinderGeometry(0.3, 0.8, 1, 6);
  const leftFairing = new THREE.Mesh(fairingGeometry, materials.fuselage);
  leftFairing.rotation.z = Math.PI / 2;
  leftFairing.position.set(-1, -0.2, 0.2);
  const rightFairing = new THREE.Mesh(fairingGeometry, materials.fuselage);
  rightFairing.rotation.z = Math.PI / 2;
  rightFairing.position.set(1, -0.2, 0.2);
  wingGroup.add(leftFairing, rightFairing);
  
  aircraft.add(wingGroup);
  
  // Cockpit - characteristic bubble canopy
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'cockpit';
  
  // Canopy frame
  const frameGeometry = new THREE.TorusGeometry(0.5, 0.05, 4, 8, Math.PI);
  const frame = new THREE.Mesh(frameGeometry, materials.detail);
  frame.position.set(0, 0.65, -0.8);
  frame.rotation.x = Math.PI / 2;
  cockpitGroup.add(frame);
  
  // Bubble canopy
  const canopyGeometry = new THREE.SphereGeometry(0.55, 8, 6, 0, Math.PI, 0, Math.PI * 0.8);
  const canopy = new THREE.Mesh(canopyGeometry, materials.cockpit);
  canopy.position.set(0, 0.65, -0.8);
  canopy.rotation.z = Math.PI;
  cockpitGroup.add(canopy);
  
  aircraft.add(cockpitGroup);
  
  // Tail - Spitfire's distinctive tail shape
  const tailGroup = new THREE.Group();
  tailGroup.name = 'tail';
  
  // Vertical stabilizer with rounded top
  const vStabShape = new THREE.Shape();
  vStabShape.moveTo(0, 0);
  vStabShape.lineTo(0, 1.8);
  vStabShape.quadraticCurveTo(0.5, 2.2, 1, 1.8);
  vStabShape.lineTo(1, 0);
  
  const vStabGeometry = new THREE.ExtrudeGeometry(vStabShape, {
    depth: 0.1,
    bevelEnabled: false
  });
  const vStab = new THREE.Mesh(vStabGeometry, materials.wing);
  vStab.position.set(-0.05, 0, -4);
  tailGroup.add(vStab);
  
  // Rudder
  const rudderGeometry = new THREE.BoxGeometry(0.08, 1.6, 0.8);
  const rudder = new THREE.Mesh(rudderGeometry, materials.wing);
  rudder.position.set(0, 0.9, -4.4);
  tailGroup.add(rudder);
  
  // Horizontal stabilizer with elevator
  const hStabGeometry = new THREE.BoxGeometry(3.5, 0.1, 0.8);
  const hStab = new THREE.Mesh(hStabGeometry, materials.wing);
  hStab.position.set(0, 0.3, -4);
  tailGroup.add(hStab);
  
  // Elevators
  const elevatorGeometry = new THREE.BoxGeometry(3.4, 0.08, 0.5);
  const elevator = new THREE.Mesh(elevatorGeometry, materials.wing);
  elevator.position.set(0, 0.3, -4.3);
  tailGroup.add(elevator);
  
  aircraft.add(tailGroup);
  
  // Propeller - 3-blade like later Spitfires
  const propellerGroup = new THREE.Group();
  propellerGroup.name = 'propeller';
  
  // Propeller hub
  const hubGeometry = new THREE.ConeGeometry(0.25, 0.8, 6);
  const hub = new THREE.Mesh(hubGeometry, materials.detail);
  hub.rotation.x = -Math.PI / 2;
  propellerGroup.add(hub);
  
  // Three blades
  const bladeGeometry = new THREE.BoxGeometry(0.25, 3.5, 0.4);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(bladeGeometry, materials.detail);
    blade.rotation.z = (i * 2 * Math.PI) / 3;
    propellerGroup.add(blade);
  }
  
  propellerGroup.position.set(0, 0, 3.2);
  aircraft.add(propellerGroup);
  
  // Engine cowling - Merlin engine housing
  const cowlingGroup = new THREE.Group();
  
  // Main cowling
  const cowlingGeometry = new THREE.CylinderGeometry(0.9, 0.85, 1.8, 8);
  const cowling = new THREE.Mesh(cowlingGeometry, materials.fuselage);
  cowling.rotation.z = Math.PI / 2;
  cowling.position.set(0, 0, 2.5);
  cowlingGroup.add(cowling);
  
  // Exhaust stubs (characteristic of Spitfire)
  const exhaustGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 4);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI - Math.PI / 2;
    const exhaust = new THREE.Mesh(exhaustGeometry, materials.detail);
    exhaust.position.set(Math.cos(angle) * 0.9, Math.sin(angle) * 0.9 + 0.3, 2.5);
    exhaust.rotation.z = angle;
    cowlingGroup.add(exhaust);
  }
  
  // Air intake under nose
  const intakeGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.5);
  const intake = new THREE.Mesh(intakeGeometry, materials.fuselage);
  intake.position.set(0, -0.9, 2.2);
  cowlingGroup.add(intake);
  
  aircraft.add(cowlingGroup);
  
  // Add RAF roundel decals (simple representation)
  const roundelGeometry = new THREE.RingGeometry(0.3, 0.5, 16);
  const roundelMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff0000, 
    side: THREE.DoubleSide 
  });
  
  // Wing roundels
  const leftRoundel = new THREE.Mesh(roundelGeometry, roundelMaterial);
  leftRoundel.rotation.x = -Math.PI / 2;
  leftRoundel.position.set(-3, -0.25, 0);
  aircraft.add(leftRoundel);
  
  const rightRoundel = new THREE.Mesh(roundelGeometry, roundelMaterial);
  rightRoundel.rotation.x = -Math.PI / 2;
  rightRoundel.position.set(3, -0.25, 0);
  aircraft.add(rightRoundel);
  
  // Fuselage roundel
  const fuselageRoundel = new THREE.Mesh(roundelGeometry, roundelMaterial);
  fuselageRoundel.position.set(0.82, 0, -1.5);
  fuselageRoundel.rotation.y = Math.PI / 2;
  aircraft.add(fuselageRoundel);
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