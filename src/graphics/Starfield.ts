import * as THREE from "three";
import { Lifetime } from '../core';

/// Adds a stary background to a 3D scene.
export class Starfield {
  private closest = 600;
  private farthest = 800;
  private geom;
  private smallMat;
  private bigMat;
  private stars: THREE.Points[] = [];

  constructor(
    readonly lt: Lifetime,
    readonly scene: THREE.Scene
  ) {
    this.geom = lt.own(new THREE.BufferGeometry());
    this.geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0.0, 0.0, 0.0]), 3));
    this.smallMat = lt.own(new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 }));
    this.bigMat = lt.own(new THREE.PointsMaterial({ color: 0xffffff, size: 2.0 }));

    for(let i = 0; i < 100; i++) {
      this.newStar(this.bigMat);
    }
    for(let i = 0; i < 300; i++) {
      this.newStar(this.smallMat);
    }

    for (let i = 0; i < this.stars.length; i++) {
      this.scene.add(this.stars[i]);
    }
  }

  newStar(mat: THREE.Material) {
    const star = new THREE.Points(this.geom, mat);
    star.position.set(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5);
    star.position.normalize()
    const distance = Math.random() * (this.farthest - this.closest) + this.closest;
    star.position.multiplyScalar(distance);
    star.matrixAutoUpdate = false;
    star.updateMatrix();
    this.stars.push(star);
  }

  /// removing from scene can be easily implemented if needed
}
