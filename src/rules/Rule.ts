import * as THREE from "three";
import { Boid } from "../objects/Boid";
import { BoidSimulationParams } from "../BoidSimulation";

export interface RuleArguments {
    neighbours: Boid[];
    simParams: BoidSimulationParams;
}

export interface RuleOptions {
    minWeight?: number;
    maxWeight?: number;
}

export abstract class Rule {
    weight: number;

    // min and max weight values, for when changing weight with GUI
    readonly minWeight: number;
    readonly maxWeight: number;

    readonly alwaysApplyToLeaderBoids: boolean = false;

    // name to show on the GUI controls
    abstract readonly name: string;

    constructor(weight: number, options?: RuleOptions) {
        this.weight = weight;
        this.minWeight = options?.minWeight ?? 0;
        this.maxWeight = options?.maxWeight ?? weight * 2;
    }

    abstract calculateVector(thisBoid: Boid, args: RuleArguments): THREE.Vector3;
}
