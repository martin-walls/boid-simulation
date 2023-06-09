import "./main.css";
import { BoidSimulation } from "./BoidSimulation";

let simulation: BoidSimulation;

window.addEventListener("load", () => {
    simulation = new BoidSimulation();
    // uncomment this line to draw a set of axes, to help in development knowing which way is x/y/z
    // simulation.enableAxesHelper();
    animate();
});

/**
 * The render loop - gets called once per frame to update the scene.
 */
function animate() {
    requestAnimationFrame(animate);
    simulation.update();
}
