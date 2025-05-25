import * as THREE from 'three';

export interface Entity {
  update(deltaTime: number): void;
  getObject3D(): THREE.Object3D;
  dispose(): void;
}