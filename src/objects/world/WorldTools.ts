import { World } from "./World";

export class WorldTools {
    static getNames(worlds: Array<World>): Array<string> {
        const names: Array<string> = [];
        for (const world of worlds) {
            names.push(world.name);
        }
        return names;
    }

    static getWorldByName(worlds: Array<World>, worldName: string): World {
        for (const world of worlds) {
            if (world.name === worldName) {
                return world;
            }
        }
        throw new Error("World not found.");
    }
}
