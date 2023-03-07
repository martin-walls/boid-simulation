import * as THREE from "three";
import { Rule, RuleArguments } from "../rules/Rule";
import { Bounds3D } from "../Bounds3D";
import { Material } from "three";

export interface BoidOptions {
    // Initial boid position
    position: THREE.Vector3;
    // Initial boid velocity
    velocity: THREE.Vector3;
    photorealisticRendering?: boolean;
}

export type BoidId = number;

export class Boid {
    readonly id: BoidId;

    mesh: THREE.Mesh;

    velocity: THREE.Vector3;

    /**
     * Each boid has a random bias that gets added to the calculated velocity
     * at each timestep.
     * The random bias is changed by a tiny random amount each timestep.
     *
     * This provides "slower" randomness than directly adding randomness to the
     * velocity at each timestep. (Because the randomness is effectively
     * remembered between timesteps.)
     *
     * Once the random bias gets above a certain threshold, it's scaled to a tiny
     * amount again, so that it doesn't just keep accumulating over time forever.
     */
    randomBias = new THREE.Vector3();

    /**
     * Base colour of the boid, before randomly adjusting lightness of each boid.
     * H, S, and L are in the range [0, 1].
     */
    private baseColour = { h: 0.602, s: 0.32, l: 0.3 };

    constructor(id: BoidId, options: BoidOptions) {
        this.id = id;
        // model boids as a cone so we can see their direction
        const geometry = new THREE.ConeGeometry(1, 4);

        let material: Material;
        if (options.photorealisticRendering) {
            material = new THREE.MeshStandardMaterial({
                color: this.generateIndividualColour(options.photorealisticRendering),
                metalness: 1,
            });
        } else {
            material = new THREE.MeshBasicMaterial({
                color: this.generateIndividualColour(options.photorealisticRendering ?? false),
            });
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(options.position.x, options.position.y, options.position.z);

        this.velocity = options.velocity;
    }

    /**
     * Randomly generate a version of `this.baseColour`, with lightness adjusted.
     */
    private generateIndividualColour(photorealisticRendering: boolean) {
        let lightnessAdjust: number;
        if (photorealisticRendering) {
            lightnessAdjust = Math.random() * 0.8;
        } else {
            lightnessAdjust = Math.random() * 0.4 - 0.2;
        }

        let l = this.baseColour.l + lightnessAdjust;
        // constrain lightness to range [0, 1]
        l = Math.max(l, 0);
        l = Math.min(l, 1);

        return new THREE.Color().setHSL(this.baseColour.h, this.baseColour.s, l);
    }

    get position() {
        return this.mesh.position;
    }

    get velocityNormalised() {
        return new THREE.Vector3().copy(this.velocity).normalize();
    }

    /**
     * Factory method to generate a boid with random position and velocity.
     * Options can be passed to control the min/max bounds for the random generation.
     * For any bounds that aren't passed, sensible defaults are used.
     */
    static generateWithRandomPosAndVel(
        id: BoidId,
        options?: {
            positionBounds?: Bounds3D;
            velocityBounds?: Bounds3D;
            photorealisticRendering: boolean;
        },
    ): Boid {
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

        return new Boid(id, {
            position: new THREE.Vector3(
                Math.random() * (maxXPos - minXPos) + minXPos,
                Math.random() * (maxYPos - minYPos) + minYPos,
                Math.random() * (maxZPos - minZPos) + minZPos,
            ),
            velocity: new THREE.Vector3(
                Math.random() * (maxXVel - minXVel) + minXVel,
                Math.random() * (maxYVel - minYVel) + minYVel,
                Math.random() * (maxZVel - minZVel) + minZVel,
            ),
            photorealisticRendering: options !== undefined && options.photorealisticRendering,
        });
    }

    updateAndMove(rules: Rule[], ruleArguments: RuleArguments) {
        for (const rule of rules) {
            const ruleVector = rule.calculateVector(this, ruleArguments);
            this.velocity.add(ruleVector);
        }

        this.capSpeed(ruleArguments.simParams.maxSpeed);

        this.addRandomnessToVelocity(ruleArguments);

        this.move();
    }

    capSpeed(maxSpeed: number) {
        if (this.velocity.length() > maxSpeed) {
            this.velocity.setLength(maxSpeed);
        }
    }

    addRandomnessToVelocity(ruleArguments: RuleArguments) {
        this.updateRandomBias(
            ruleArguments.simParams.randomnessPerTimestep,
            ruleArguments.simParams.randomnessLimit,
        );
        this.velocity.add(this.randomBias);
    }

    /*
     * move the boid by its velocity vector
     */
    move() {
        // point the void to face in the direction it's moving
        this.pointInDirection(this.velocity);
        this.position.add(this.velocity);
    }

    /**
     * Point the boid to face in the direction of the given vector
     */
    private pointInDirection(vector: THREE.Vector3) {
        const phi = Math.atan2(-vector.z, vector.x);
        const a = Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.z, 2));
        const theta = Math.atan2(a, vector.y);

        // reset the rotation, so we can apply our rotations independent of where
        // we're currently pointed
        this.mesh.rotation.set(0, 0, 0);
        // rotate around the world's z-axis by theta clockwise
        this.mesh.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -theta);
        // rotate around the world's y-axis by phi anticlockwise
        this.mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), phi);
    }

    isOtherBoidVisible(other: Boid, visibilityThreshold: number): boolean {
        return this.position.distanceTo(other.position) < visibilityThreshold;
    }

    updateRandomBias(randomnessPerTimestep: number, randomnessLimit: number) {
        this.randomBias.add(
            new THREE.Vector3(
                Math.random() * randomnessPerTimestep - randomnessPerTimestep / 2,
                Math.random() * randomnessPerTimestep - randomnessPerTimestep / 2,
                Math.random() * randomnessPerTimestep - randomnessPerTimestep / 2,
            ),
        );

        // once randomness gets above a certain threshold, scale it back
        // -- so randomness doesn't just keep getting bigger all the time
        if (this.randomBias.length() > randomnessLimit) {
            this.randomBias.divideScalar(100);
        }
    }
}
