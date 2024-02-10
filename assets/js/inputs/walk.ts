import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { ICameraInput } from "@babylonjs/core/Cameras/cameraInputsManager";
import { Vector3 } from "@babylonjs/core/Maths";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";

export class WalkInput implements ICameraInput<UniversalCamera> {

  camera: UniversalCamera;
  keyboardObservable;
  rotationMagnitude = 0.1;

  UP_ARROW = 38;
  DOWN_ARROW = 40;
  RIGHT_ARROW = 39;
  LEFT_ARROW = 37;
  A_KEY = 65;
  D_KEY = 68;
  W_KEY = 87;
  S_KEY = 83;
  E_KEY = 69;
  Q_KEY = 81;

  keysForward = [this.UP_ARROW, this.W_KEY];
  keysBackward = [this.DOWN_ARROW, this.S_KEY];
  keysRotateRight = [this.RIGHT_ARROW, this.E_KEY];
  keysRotateLeft = [this.LEFT_ARROW, this.Q_KEY];
  keysStrafeRight = [this.D_KEY];
  keysStrafeLeft = [this.A_KEY];

  myKeysMatched(keyCode: number): boolean {
    return this.keysForward.includes(keyCode) ||
      this.keysBackward.includes(keyCode) ||
      this.keysRotateRight.includes(keyCode) ||
      this.keysRotateLeft.includes(keyCode) ||
      this.keysStrafeLeft.includes(keyCode) ||
      this.keysStrafeRight.includes(keyCode);
  }

  // stores unique keyCodes that are currently pressed
  keys: Set<number> = new Set();

  public getClassName(): string {
    return "WalkInput";
  }
  public getSimpleName(): string {
    return "walk";
  }

  public attachControl(noPreventDefault?: boolean): void {

    this.keyboardObservable = this.camera.getScene().onKeyboardObservable.add((kbInfo) => {
      const { type, event } = kbInfo;
      if (type === KeyboardEventTypes.KEYDOWN) {
        if (this.myKeysMatched(event.inputIndex)) {
          this.keys.add(event.inputIndex);
        }
        if (!noPreventDefault) {
          event.preventDefault();
        }
      } else {
        // keyup event
        if (this.myKeysMatched(event.inputIndex)) {
          this.keys.delete(event.inputIndex);
        }
        if (!noPreventDefault) {
          event.preventDefault();
        }
      }
    });
  }


  public detachControl() {
    this.camera.getScene().onKeyboardObservable.remove(this.keyboardObservable);
  }

  public checkInputs() {
    let camera = this.camera;

    // modify the camera influence using every valid keyboard movement press
    camera._localDirection.copyFromFloats(0, 0, 0);
    for (const keyCode of this.keys) {

      let speed = camera._computeLocalCameraSpeed();

      if (this.keysForward.includes(keyCode)) {
        camera._localDirection.z += speed;
      } else if (this.keysBackward.includes(keyCode)) {
        camera._localDirection.z -= speed;
      } else if (this.keysStrafeLeft.includes(keyCode)) {
        camera._localDirection.x -= speed;
      } else if (this.keysStrafeRight.includes(keyCode)) {
        camera._localDirection.x += speed;
      } else if (this.keysRotateRight.includes(keyCode)) {
        camera.cameraRotation.y += speed * this.rotationMagnitude;
      } else if (this.keysRotateLeft.includes(keyCode)) {
        camera.cameraRotation.y -= speed * this.rotationMagnitude;

      }
      this.updateCamera();
    }

  }

  updateCamera() {
    this.camera.getViewMatrix().invertToRef(this.camera._cameraTransformMatrix);
    Vector3.TransformNormalToRef(this.camera._localDirection, this.camera._cameraTransformMatrix, this.camera._transformedDirection);
    // this.camera._transformedDirection.y = 0;
    this.camera.cameraDirection.addInPlace(this.camera._transformedDirection);
  }


}