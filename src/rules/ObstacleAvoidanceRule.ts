import { Rule, RuleArguments, RuleOptions } from "./Rule";
import { Boid } from "../objects/Boid";
import * as THREE from "three";
import { World } from "../objects/world/World";

export interface ObstacleAvoidanceRuleOptions extends RuleOptions {
    sharpness?: number;
    world: World;
}

export class ObstacleAvoidanceRule extends Rule {
    readonly name = "Avoid Obstacle Boundary";

    readonly alwaysApplyToLeaderBoids = true;

    /**
     * How "sharp" the obstacle boundary should be.
     * Higher values will produce snappier changes in direction.
     *
     * Controls the steepness of the curve of the exponential weighting of distance.
     *
     * Min value: 1
     */
    private readonly SHARPNESS;

    private world: World;

    constructor(weight: number, options: ObstacleAvoidanceRuleOptions) {
        super(weight, options);
        this.SHARPNESS = options.sharpness ?? 3;
        this.world = options.world;
    }

    setWorld(world: World) {
        this.world = world;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    calculateVector(thisBoid: Boid, _args: RuleArguments): THREE.Vector3 {
        const finalVector = new THREE.Vector3();

        for (const cylinder of this.world.obstacles.cylinders) {
            const avoidanceVector = new THREE.Vector3();
            const adjustedCylinderPosition = new THREE.Vector3(
                cylinder.basePoint.x,
                thisBoid.position.y,
                cylinder.basePoint.z,
            );
            avoidanceVector.subVectors(thisBoid.position, adjustedCylinderPosition);
            let distance = avoidanceVector.length() - cylinder.radius;
            if (distance < 0) {
                distance = 0;
            }
            const avoidanceMagnitude = Math.pow(this.SHARPNESS, -(distance - 10));
            avoidanceVector.setLength(avoidanceMagnitude);
            finalVector.add(avoidanceVector);
        }

        finalVector.multiplyScalar(this.weight);
        return finalVector;
    }
}
