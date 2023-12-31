

import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Scene } from "@babylonjs/core/scene";

import { GridMaterial } from "@babylonjs/materials/grid/gridMaterial";
import "@babylonjs/core/Materials/standardMaterial";

export class Room {
  constructor() {
    // create the canvas html element and attach it to the webpage
    var canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.id = "gameCanvas";
    document.body.appendChild(canvas);

    // initialize babylon scene and engine
    var engine = new Engine(canvas, true);
    var scene = new Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);

    // This targets the camera to scene origin
    camera.setTarget(Vector3.Zero());

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);
    var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
    var sphere = CreateSphere("sphere", { diameter: 1 }, scene);


    // Create a grid material
    var material = new GridMaterial("grid", scene);

    // Our built-in 'sphere' shape.
    var sphere = CreateSphere("sphere1", { segments: 16, diameter: 2 }, scene);

    // Move the sphere upward 1/2 its height
    sphere.position.y = 2;

    // Affect a material
    sphere.material = material;

    // Our built-in 'ground' shape.
    var ground = CreateGround("ground1", { width: 6, height: 6, subdivisions: 2 }, scene);

    // Affect a material
    ground.material = material;

    // hide/show the Inspector
    window.addEventListener("keydown", async (ev) => {
      // Shift+Ctrl+Alt+I
      await import("@babylonjs/core/Debug/debugLayer");
      await import("@babylonjs/inspector");


      if (ev.ctrlKey && ev.key === 'b') {
        console.log("invoking the debug layer");
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide();
        } else {
          scene.debugLayer.show();
        }
      }
    });

    // run the main render loop
    engine.runRenderLoop(() => {
      scene.render();
    });
  }
}

