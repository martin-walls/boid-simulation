import { Bounds3D } from "./Bounds3D";
import { Boid } from "./objects/Boid";
import * as THREE from "three";

/*
 * All available types of boid that can be generated.
 * Add options for new types of boid here, and generate them in the switch statement below.
 */
export enum BoidType {
    Normal,
}

export class BoidGenerator {
    /**
     * Factory method to generate a boid of a certain type with random position and velocity.
     * Options can be passed to control the min/max bounds for the random generation.
     * For any bounds that aren't passed, sensible defaults are used.
     */
    static generateBoidWithRandomPosAndVec(
        options?: {
            boidType?: BoidType;
            positionBounds?: Bounds3D;
            velocityBounds?: Bounds3D;
            acceleration?: number;
            photorealisticRendering: boolean;
        },
    ): Boid {
        const type = options?.boidType ?? BoidType.Normal;

        // default position and velocity bounds
        const minXPos = options?.positionBounds?.xMin ?? -100;
        const maxXPos = options?.positionBounds?.xMax ?? 100;
        const minYPos = options?.positionBounds?.yMin ?? 0;
        const maxYPos = options?.positionBounds?.yMax ?? 50;
        const minZPos = options?.positionBounds?.zMin ?? -100;
        const maxZPos = options?.positionBounds?.zMax ?? 100;

        const minXVel = options?.velocityBounds?.xMin ?? -0.2;
        const maxXVel = options?.velocityBounds?.xMax ?? 0.2;
        const minYVel = options?.velocityBounds?.yMin ?? -0.02;
        const maxYVel = options?.velocityBounds?.yMax ?? 0.02;
        const minZVel = options?.velocityBounds?.zMin ?? -0.2;
        const maxZVel = options?.velocityBounds?.zMax ?? 0.2;

        const acceleration = options?.acceleration ?? 0.01;

        const photorealisticRendering = options?.photorealisticRendering ?? false;

        const randomPosition = new THREE.Vector3(
            Math.random() * (maxXPos - minXPos) + minXPos,
            Math.random() * (maxYPos - minYPos) + minYPos,
            Math.random() * (maxZPos - minZPos) + minZPos,
        );

        const randomVelocity = new THREE.Vector3(
            Math.random() * (maxXVel - minXVel) + minXVel,
            Math.random() * (maxYVel - minYVel) + minYVel,
            Math.random() * (maxZVel - minZVel) + minZVel,
        );

        // generate the correct type of boid
        switch (type) {
            case BoidType.Normal:
                return new Boid({
                    position: randomPosition,
                    velocity: randomVelocity,
                    acceleration,
                    photorealisticRendering,
                });
        }
    }
}
