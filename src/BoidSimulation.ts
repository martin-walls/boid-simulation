import { Simulation } from "./Simulation";
import { Boid } from "./objects/Boid";
import { GUI } from "dat.gui";
import { Floor } from "./objects/Floor";
import { SeparationRule } from "./rules/SeparationRule";
import { CohesionRule } from "./rules/CohesionRule";
import { AlignmentRule } from "./rules/AlignmentRule";
import { Bounds3D } from "./Bounds3D";
import { WorldBoundaryRule } from "./rules/WorldBoundaryRule";
import { CollisionAvoidanceRule } from "./rules/CollisionAvoidanceRule";
import { Arena } from "./objects/Arena";
import { NoDropoff } from "./dropoffs/NoDropoff";
import { ExponentialDropoff } from "./dropoffs/ExponentialDropoff";
import { InversePropDropoff } from "./dropoffs/InversePropDropoff";
import { ProportionalDropoff } from "./dropoffs/ProportionalDropoff";
import { Dropoff } from "./dropoffs/Dropoff";

export interface BoidSimulationParams {
    boidCount: number;
    visibilityThreshold: number;
    angularThreshold: number;
    maxSpeed: number;
    worldDimens: Bounds3D;
    randomnessPerTimestep: number;
    randomnessLimit: number;
    dropoffRule: Dropoff;
    angularNoise: number;
}

export class BoidSimulation extends Simulation {
    controlsGui: GUI;

    boids: Boid[] = [];

    simParams: BoidSimulationParams = {
        boidCount: 50,
        visibilityThreshold: 50,
        angularThreshold: 90,
        maxSpeed: 0.5,
        worldDimens: Bounds3D.centredXZ(200, 200, 100),
        randomnessPerTimestep: 0.01,
        randomnessLimit: 0.1,
        dropoffRule: new NoDropoff(1),
        angularNoise: 0
    };

    rules = [
        new SeparationRule(0.8),
        new CohesionRule(1),
        new AlignmentRule(1),
        new WorldBoundaryRule(10),
        new CollisionAvoidanceRule(10),
    ];

    dropoffs = [
        new NoDropoff(1),
        new ExponentialDropoff(Math.E),
        new InversePropDropoff(1),
        new ProportionalDropoff(this.simParams.visibilityThreshold, 1)
    ]



    enabledDropoff = {
        0: true,
        1: false,
        2: false,
        3: false
    }
    enabledDropoffKeys = [0, 1, 2, 3]

    constructor(params?: BoidSimulationParams) {
        super();

        if (params) {
            this.simParams = params;
        }

        // init controls GUI
        this.controlsGui = new GUI({
            hideable: false,
        });
        this.controlsGui.add(this.simParams, "boidCount", 10, 200).name("Boid count");
        this.controlsGui.add(this.simParams, "maxSpeed", 0.1, 2, 0.01).name("Max speed");
        this.controlsGui
            .add(this.simParams, "visibilityThreshold", 5, 100)
            .name("Visibility radius");
        this.controlsGui
            .add(this.simParams, "angularThreshold", 10, 180)
            .name("Visibility angle");

        this.controlsGui
            .add(this.simParams, "angularNoise", 0, 2, 0.01)
            .name("Angular noise");


        // controls to change level of randomness
        const randomnessGui = this.controlsGui.addFolder("Randomness");
        randomnessGui.open();
        randomnessGui
            .add(this.simParams, "randomnessPerTimestep", 0, 0.02, 0.001)
            .name("Per timestep");
        randomnessGui.add(this.simParams, "randomnessLimit", 0, 0.5, 0.01).name("Limit");

        // controls to change rule weights
        const ruleWeightsGui = this.controlsGui.addFolder("Rule weights");
        ruleWeightsGui.open();
        for (const rule of this.rules) {
            ruleWeightsGui.add(rule, "weight", rule.minWeight, rule.maxWeight, 0.1).name(rule.name);
        }

        const dropoffRulesGui = this.controlsGui.addFolder("Dropoff Rules");
        dropoffRulesGui.open();



        for (var i: number = 0; i<this.dropoffs.length; i++) {
            let drop = this.dropoffs[i]
            dropoffRulesGui.add(this.enabledDropoff, i.toString()).onChange((v) => {if (v) {this.simParams.dropoffRule = this.dropoffs[i]} this.enabledDropoffKeys.forEach(j => {this.enabledDropoff[j as keyof typeof this.enabledDropoff] = (i==j ? v : !v)});})
            dropoffRulesGui.add(drop, "constant", drop.minConst, drop.maxConst, drop.constant).name(drop.name + " constant")
        }

        // add a floor to the simulation
        const floor = new Floor();
        this.addObjectToScene(floor.mesh);

        const arena = new Arena(this.simParams.worldDimens);
        this.addObjectsToScene(arena.mesh);
    }

    update() {
        // update boids before updating base simulation to rerender
        this.updateBoidCount();

        this.boids.map((boid) =>
            // boid.update(this.getBoidNeighbours(boid), this.steeringForceCoefficients),
            boid.update(this.rules, {
                neighbours: this.getBoidNeighbours(boid),
                simParams: this.simParams,
            }),
        );

        super.update();
    }

    updateBoidCount() {
        if (this.simParams.boidCount === this.boids.length) {
            return;
        }
        // Calculate how many boids we need to generate/remove.
        // Do this here so we don't evaluate boids.length on every loop iteration.
        let difference = this.simParams.boidCount - this.boids.length;
        while (difference > 0) {
            // generate new boids
            const boid = Boid.generateWithRandomPosAndVel();
            this.addObjectToScene(boid.mesh);
            this.boids.push(boid);
            difference--;
        }
        while (difference < 0) {
            // remove boids
            const boid = this.boids.pop();
            if (boid === undefined) {
                // handle the case that for some reason there's no boid to remove
                break;
            }
            this.removeObjectFromScene(boid.mesh);
            difference++;
        }
    }

    getBoidNeighbours(boid: Boid): Boid[] {
        const neighbours = [];
        for (const otherBoid of this.boids) {
            if (otherBoid === boid) {
                continue;
            }
            if (boid.isOtherBoidVisible(otherBoid, this.simParams.visibilityThreshold, this.simParams.angularThreshold/180*Math.PI)) {
                neighbours.push(otherBoid);
            }
        }
        return neighbours;
    }
}
