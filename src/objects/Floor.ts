import * as THREE from "three";
import { StaticObject } from "../SimulationObject";

export interface FloorOptions {
    withGrid?: boolean;
}

export class Floor implements StaticObject {
    mesh: THREE.Object3D<THREE.Event>;

    private static readonly SIZE = 1000;

    constructor(options?: FloorOptions) {
        const geometry = new THREE.PlaneGeometry(Floor.SIZE, Floor.SIZE);
        const material = new THREE.MeshBasicMaterial({ color: 0xd4d4d8 });
        const floorMesh = new THREE.Mesh(geometry, material);

        // make the plane horizontal
        floorMesh.rotateX(-Math.PI / 2);
        // so that the floor doesn't "disappear" when camera is rotated to exactly horizontal
        floorMesh.position.setY(-1);

        if (options?.withGrid ?? true) {
            const gridHelper = new THREE.GridHelper(Floor.SIZE, 20);
            gridHelper.add(floorMesh);

            this.mesh = gridHelper;
        } else {
            this.mesh = floorMesh;
        }
    }
}
