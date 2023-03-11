import * as THREE from "three";
import { BoidSimulationParams, RenderingMode } from "../BoidSimulation";

export class Arena {
    readonly mesh: Array<THREE.Object3D<THREE.Event>> = [];
    private readonly wallWidth: number = 0.05;
    private readonly floorGap: number = 0.5;

    constructor(params: BoidSimulationParams) {
        const dims = params.worldDimens;

        if (params.rendering === RenderingMode.Photorealistic) {
            this.wallWidth = 5;
            this.floorGap = 10;
        }

        const wallTop = new THREE.BoxGeometry(
            dims.xSize + 2 * this.wallWidth,
            dims.ySize - this.floorGap,
            this.wallWidth,
        );
        const wallBottom = new THREE.BoxGeometry(
            dims.xSize + 2 * this.wallWidth,
            dims.ySize - this.floorGap,
            this.wallWidth,
        );
        const wallLeft = new THREE.BoxGeometry(
            this.wallWidth,
            dims.ySize - this.floorGap,
            dims.zSize,
        );
        const wallRight = new THREE.BoxGeometry(
            this.wallWidth,
            dims.ySize - this.floorGap,
            dims.zSize,
        );

        const material = new THREE.MeshBasicMaterial({ color: 0xa49040 }); // 0xa48340
        material.transparent = true;
        material.opacity = 0.15;

        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

        const meshTop = new THREE.Mesh(wallTop, material);
        meshTop.position.set(
            0,
            (dims.ySize + this.floorGap) / 2,
            (dims.zSize + this.wallWidth) / 2,
        );

        const meshBottom = new THREE.Mesh(wallBottom, material);
        meshBottom.position.set(
            0,
            (dims.ySize + this.floorGap) / 2,
            -(dims.zSize + this.wallWidth) / 2,
        );

        const meshLeft = new THREE.Mesh(wallLeft, material);
        meshLeft.position.set(
            -(dims.xSize + this.wallWidth) / 2,
            (dims.ySize + this.floorGap) / 2,
            0,
        );

        const meshRight = new THREE.Mesh(wallRight, material);
        meshRight.position.set(
            (dims.xSize + this.wallWidth) / 2,
            (dims.ySize + this.floorGap) / 2,
            0,
        );

        this.mesh.push(meshTop);
        this.mesh.push(meshBottom);
        this.mesh.push(meshLeft);
        this.mesh.push(meshRight);

        const wireframeTop = new THREE.LineSegments(
            new THREE.EdgesGeometry(meshTop.geometry),
            lineMaterial,
        );
        wireframeTop.position.set(
            0,
            (dims.ySize + this.floorGap) / 2,
            (dims.zSize + this.wallWidth) / 2,
        );

        const wireframeBottom = new THREE.LineSegments(
            new THREE.EdgesGeometry(meshBottom.geometry),
            lineMaterial,
        );
        wireframeBottom.position.set(
            0,
            (dims.ySize + this.floorGap) / 2,
            -(dims.zSize + this.wallWidth) / 2,
        );

        const wireframeLeft = new THREE.LineSegments(
            new THREE.EdgesGeometry(meshLeft.geometry),
            lineMaterial,
        );
        wireframeLeft.position.set(
            -(dims.xSize + this.wallWidth) / 2,
            (dims.ySize + this.floorGap) / 2,
            0,
        );

        const wireframeRight = new THREE.LineSegments(
            new THREE.EdgesGeometry(meshRight.geometry),
            lineMaterial,
        );
        wireframeRight.position.set(
            (dims.xSize + this.wallWidth) / 2,
            (dims.ySize + this.floorGap) / 2,
            0,
        );

        this.mesh.push(wireframeTop);
        this.mesh.push(wireframeBottom);
        this.mesh.push(wireframeLeft);
        this.mesh.push(wireframeRight);
    }
}
