import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Scene } from "@babylonjs/core/scene";
import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial";
import "@babylonjs/core/Materials/standardMaterial";
import { Config } from "../config";



// create the babylonjs engine and scene

// create the canvas html element and attach it to the webpage
const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.id = "gameCanvas";
canvas.style.zIndex = "1"; // don't put this too high, it blocks the VR button
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.touchAction = "none";
canvas.style.outline = "none";
document.body.appendChild(canvas);

// initialize babylon scene and engine
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
// This creates and positions a free camera (non-mesh)

// create a birds-eye-view pointed at the origin
const default_position = new Vector3(0, 15, 50);
const camera = new UniversalCamera("my head", default_position, scene);

// This targets the camera to scene origin
camera.setTarget(Vector3.Zero());

// This attaches the camera to the canvas
camera.attachControl(canvas, true);
new HemisphericLight("light1", new Vector3(1, 1, 0), scene);

// Create a grid material
const material = new GridMaterial("grid", scene);

// Our built-in 'sphere' shape.
const sphere = CreateSphere("sphere1", { segments: 16, diameter: 2 }, scene);

// Move the sphere upward 1/2 its height
sphere.position.y = 2;

// Our built-in 'ground' shape.
const ground = CreateGround("ground1", { width: 100, height: 100, subdivisions: 2 }, scene);

// Affect a material
ground.material = material;

// hide/show the Inspector
window.addEventListener("keydown", async (ev) => {

  if (ev.ctrlKey && ev.key === 'b') {
    await import("@babylonjs/core/Debug/debugLayer");
    await import("@babylonjs/inspector");
    console.log("invoking the debug layer");
    if (scene.debugLayer.isVisible()) {
      scene.debugLayer.hide();
    } else {
      scene.debugLayer.show({ embedMode: true });
    }
  }
});

window.addEventListener("resize", function () {
  engine.resize();
});

// run the main render loop
engine.runRenderLoop(() => {
  scene.render();
});


export const init = (config: Config) => {
  config.scene = scene;
};