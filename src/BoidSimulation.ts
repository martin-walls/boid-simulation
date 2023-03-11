import { Simulation } from "./Simulation";
import { Boid, BoidId } from "./objects/Boid";
import { GUI } from "dat.gui";
import { Floor } from "./objects/Floor";
import { SeparationRule } from "./rules/SeparationRule";
import { CohesionRule } from "./rules/CohesionRule";
import { AlignmentRule } from "./rules/AlignmentRule";
import { WorldBoundaryRule } from "./rules/WorldBoundaryRule";
import { CollisionAvoidanceRule } from "./rules/CollisionAvoidanceRule";
import { Arena } from "./objects/Arena";
import { ChangeOfLeaderBoidOptions } from "./objects/ChangeOfLeaderBoid";
import { Water } from "./objects/Water";
import { Sky } from "./objects/Sky";
import * as THREE from "three";
import { SunParams } from "./objects/Sun";
import { ShaderMaterial } from "three";
import { World } from "./objects/world/World";
import { defaultWorld } from "./worlds/Default";
import { smallWorld } from "./worlds/SmallWorld";
import { Bounds3D } from "./Bounds3D";
import { WorldTools } from "./objects/world/WorldTools";
import { FollowLeaderRule } from "./rules/FollowLeaderRule";
import { BoidGenerator, BoidType } from "./BoidGenerator";
import { obstacles1 } from "./worlds/Obstacles1";
import { Cylinder } from "./objects/Cylinder";
import { ObstacleAvoidanceRule } from "./rules/ObstacleAvoidanceRule";
import { Rule } from "./rules/Rule";

export interface BoidSimulationParams {
    boidCount: number;
    boidType: BoidType;
    visibilityThreshold: number;
    maxSpeed: number;
    acceleration: number;
    worldName: string;
    worldDimens: Bounds3D;
    rendering: RenderingModes;
    randomnessPerTimestep: number;
    randomnessLimit: number;
    changeOfLeaderBoidOptions: ChangeOfLeaderBoidOptions;
}

export enum RenderingModes {
    Simple = "Simple",
    Photorealistic = "Photorealistic",
}

export class BoidSimulation extends Simulation {
    controlsGui: GUI;

    worlds: World[] = [defaultWorld, smallWorld, obstacles1];

    worldNames: string[] = WorldTools.getNames(this.worlds);

    currentWorldName: string = defaultWorld.name;
    currentRendering: string = RenderingModes.Simple;

    boids: Boid[] = [];
    private nextBoidId: BoidId = 0;

    simParams: BoidSimulationParams = {
        boidCount: 100,
        boidType: BoidType.ChangeOfLeader,
        visibilityThreshold: 25,
        maxSpeed: 0.5,
        acceleration: 0.01,
        worldName: defaultWorld.name,
        worldDimens: WorldTools.getWorldByName(
            this.worlds,
            this.currentWorldName,
        ).get3DBoundaries(),
        rendering: RenderingModes.Simple,
        randomnessPerTimestep: 0.01,
        randomnessLimit: 0.1,
        changeOfLeaderBoidOptions: {
            maxLeaderTimestep: 200,
            eccentricityThreshold: 0.5,
            neighbourCountThreshold: 8,
            becomeLeaderProbability: 0.001,
            colourBoids: true,
            peakSpeedMultiplier: 1.25,
            peakSpeedTimestepFraction: 0.25,
        },
    };

    // initial world will get set in constructor by calling reloadWorld
    private obstacleAvoidRule = new ObstacleAvoidanceRule(10, { world: defaultWorld });

    rules: Rule[] = [
        new SeparationRule(0.8),
        new CohesionRule(1),
        new AlignmentRule(1),
        new WorldBoundaryRule(10),
        new CollisionAvoidanceRule(10),
        new FollowLeaderRule(5),
        this.obstacleAvoidRule,
    ];

    private floor?: Floor;
    private arena?: Arena;
    private water?: Water;
    private sky?: Sky;
    private sun?: THREE.Vector3;
    private generator?: THREE.PMREMGenerator;
    private renderTarget?: THREE.WebGLRenderTarget;

    constructor(params?: BoidSimulationParams) {
        super();

        if (params) {
            this.simParams = params;
        }

        // Init controls GUI
        this.controlsGui = new GUI({
            hideable: false,
        });

        this.controlsGui.add(this.simParams, "worldName", this.worldNames).name("World");
        this.controlsGui
            .add(this.simParams, "rendering", this.getRenderingModeNames())
            .name("Rendering");
        this.controlsGui.add(this.simParams, "boidCount", 10, 200).name("Boid count");
        this.controlsGui.add(this.simParams, "maxSpeed", 0.1, 2, 0.01).name("Max speed");
        this.controlsGui
            .add(this.simParams, "visibilityThreshold", 5, 100)
            .name("Visibility radius");

        // Controls to change level of randomness
        const randomnessGui = this.controlsGui.addFolder("Randomness");
        randomnessGui.open();
        randomnessGui
            .add(this.simParams, "randomnessPerTimestep", 0, 0.02, 0.001)
            .name("Per timestep");
        randomnessGui.add(this.simParams, "randomnessLimit", 0, 0.5, 0.01).name("Limit");

        // Controls to change rule weights
        const ruleWeightsGui = this.controlsGui.addFolder("Rule weights");
        ruleWeightsGui.open();
        for (const rule of this.rules) {
            ruleWeightsGui.add(rule, "weight", rule.minWeight, rule.maxWeight, 0.1).name(rule.name);
        }

        // Controls for change of leader boids
        const changeOfLeaderGui = this.controlsGui.addFolder("Change of Leader");
        changeOfLeaderGui.open();
        changeOfLeaderGui
            .add(this.simParams.changeOfLeaderBoidOptions, "maxLeaderTimestep", 100, 400, 20)
            .name("Timesteps");
        changeOfLeaderGui
            .add(this.simParams.changeOfLeaderBoidOptions, "eccentricityThreshold", 0, 1, 0.05)
            .name("Eccentricity threshold");
        changeOfLeaderGui
            .add(this.simParams.changeOfLeaderBoidOptions, "neighbourCountThreshold", 0, 15, 1)
            .name("Min neighbours");
        changeOfLeaderGui
            .add(
                this.simParams.changeOfLeaderBoidOptions,
                "becomeLeaderProbability",
                0,
                0.005,
                0.0001,
            )
            .name("Leader probability");
        changeOfLeaderGui
            .add(this.simParams.changeOfLeaderBoidOptions, "peakSpeedMultiplier", 1, 2, 0.05)
            .name("Escape speed");
        changeOfLeaderGui
            .add(this.simParams.changeOfLeaderBoidOptions, "peakSpeedTimestepFraction", 0, 1, 0.05)
            .name("Speed profile");

        this.reloadWorld();
    }

    getRenderingModeNames(): string[] {
        return Object.values(RenderingModes);
    }

    initializePhotorealisticRendering() {
        // Sun
        this.sun = new THREE.Vector3();

        // Water
        const waterGeometry = new THREE.PlaneGeometry(10_000, 10_000);

        this.water = new Water(waterGeometry, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load(
                "textures/waternormals.jpg",
                function (texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                },
            ),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: true,
        });

        this.water.rotation.x = -Math.PI / 2;
        this.addToScene(this.water);

        // Sky
        this.sky = new Sky();
        this.sky.scale.setScalar(10_000);
        this.addToScene(this.sky);

        if (this.sky.material instanceof ShaderMaterial) {
            const skyUniforms = this.sky.material.uniforms;
            skyUniforms["turbidity"].value = 10;
            skyUniforms["rayleigh"].value = 2;
            skyUniforms["mieCoefficient"].value = 0.005;
            skyUniforms["mieDirectionalG"].value = 0.8;
        }

        this.generator = new THREE.PMREMGenerator(this.renderer);
        this.updateSun();
    }

    updateSun() {
        if (this.simParams.rendering !== RenderingModes.Photorealistic)
            throw new Error("Photorealistic rendering is disabled.");
        if (
            this.sun === undefined ||
            this.sky === undefined ||
            this.water === undefined ||
            this.generator === undefined
        ) {
            throw new Error("One or more photorealistic rendering variables are undefined.");
        }

        const phi = THREE.MathUtils.degToRad(90 - SunParams.elevation);
        const theta = THREE.MathUtils.degToRad(SunParams.azimuth);

        this.sun.setFromSphericalCoords(1, phi, theta);

        if (this.sky.material instanceof ShaderMaterial) {
            this.sky.material.uniforms["sunPosition"].value.copy(this.sun);
        }

        if (this.water.material instanceof ShaderMaterial) {
            this.water.material.uniforms["sunDirection"].value.copy(this.sun).normalize();
        }

        if (this.renderTarget !== undefined) {
            this.renderTarget.dispose();
        }

        this.renderTarget = this.generator.fromScene(this.scene);
        this.scene.environment = this.renderTarget.texture;
    }

    update() {
        // Reload the world if needed
        if (
            this.currentWorldName !== this.simParams.worldName ||
            this.currentRendering !== this.simParams.rendering
        ) {
            this.reloadWorld();
        }

        // update boids before updating base simulation to rerender
        this.updateBoidCount();

        this.boids.map((boid) =>
            boid.update(this.rules, {
                neighbours: this.getBoidNeighbours(boid),
                simParams: this.simParams,
            }),
        );

        if (
            this.simParams.rendering === RenderingModes.Photorealistic &&
            this.water !== undefined &&
            this.water.material instanceof ShaderMaterial
        ) {
            this.water.material.uniforms["time"].value += 1.0 / 60.0;
        }

        super.update();
    }

    reloadWorld() {
        const world = WorldTools.getWorldByName(this.worlds, this.simParams.worldName);
        this.simParams.worldDimens = world.get3DBoundaries();

        this.clearScene();

        this.obstacleAvoidRule.setWorld(world);

        // Remove old boids
        this.boids = [];

        // Arena
        this.arena = new Arena(this.simParams);
        this.addToScene(this.arena.mesh);

        if (this.simParams.rendering === RenderingModes.Photorealistic) {
            this.initializePhotorealisticRendering();
        } else {
            // Floor
            this.floor = new Floor(this.simParams);
            this.addToScene(this.floor.mesh);
        }

        // Obstacles
        for (const description of world.obstacles.cylinders) {
            const cylinder = new Cylinder({
                description: description,
                rendering: RenderingModes.Photorealistic,
            });
            this.addToScene(cylinder.mesh);
        }

        this.currentWorldName = this.simParams.worldName;
        this.currentRendering = this.simParams.rendering;
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
            const boid = BoidGenerator.generateBoidWithRandomPosAndVec(this.newBoidId(), {
                boidType: this.simParams.boidType,
                positionBounds: this.simParams.worldDimens,
                acceleration: this.simParams.acceleration,
                rendering: this.simParams.rendering,
            });
            this.addToScene(boid.mesh);
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
            this.removeFromScene(boid.mesh);
            difference++;
        }
    }

    private newBoidId(): BoidId {
        const id = this.nextBoidId;
        this.nextBoidId++;
        return id;
    }

    getBoidNeighbours(boid: Boid): Boid[] {
        const neighbours = [];
        for (const otherBoid of this.boids) {
            if (otherBoid === boid) {
                continue;
            }
            if (boid.isOtherBoidVisible(otherBoid, this.simParams.visibilityThreshold)) {
                neighbours.push(otherBoid);
            }
        }
        return neighbours;
    }
}
