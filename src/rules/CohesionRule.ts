import { Rule, RuleArguments } from "./Rule";
import * as THREE from "three";
import { Boid } from "../objects/Boid";

export class CohesionRule extends Rule {
    readonly name = "Cohesion";

    calculateVector(thisBoid: Boid, args: RuleArguments): THREE.Vector3 {
        // no cohesion force if there are no visible neighbours
        if (args.neighbours.length === 0) {
            return new THREE.Vector3();
        }
        // calculate centre of visible boids
        const centre = new THREE.Vector3();
        let weightSum = 0;
        for (const neighbour of args.neighbours) {
            let weight = args.dropoff.fn(thisBoid.toOther(neighbour).length());
            centre.addScaledVector(neighbour.position, weight);
            weightSum += weight
        }
        centre.divideScalar(weightSum);
        //console.log(centre)
        // cohesion force is towards the calculated centre
        centre.sub(thisBoid.position);

        centre.normalize();
        centre.multiplyScalar(this.weight);
        return centre;
    }
}
