/**
 * Takes a float and cuts off significant digits
 * @param number 
 * @param places 
 * @returns 
 */
export const truncate = (numberOrArray: number | number[], places = 2) => {
  if (Array.isArray(numberOrArray)) {
    return numberOrArray.map(number => truncate(number, places));
  }
  let shift = Math.pow(10, places);
  return ((numberOrArray * shift) | 0) / shift;
};

import { Observable as BabylonObservable } from "@babylonjs/core/Misc/observable";
import { Observable as RxJsObservable } from "rxjs/internal/Observable";

/**
 * Wraps a Babylon Observable into an rxjs Observable
 *
 * @param bjsObservable The Babylon Observable you want to observe
 * @example
 * ```
 * import { Engine, Scene, AbstractMesh } from '@babylonjs/core'
 *
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement
 * const engine = new Engine(canvas)
 * const scene = new Scene(engine)
 *
 * const render$: Observable<Scene> = fromBabylonObservable(scene.onAfterRenderObservable)
 * const onMeshAdded$: Observable<AbstractMesh> = fromBabylonObservable(scene.onNewMeshAddedObservable)
 * ```
 */
export function fromBabylonObservable<T>(
  bjsObservable: BabylonObservable<T>
): RxJsObservable<T> {
  return new RxJsObservable<T>((subscriber) => {
    if (!(bjsObservable instanceof BabylonObservable)) {
      throw new TypeError("the object passed in must be a Babylon Observable");
    }

    const handler = bjsObservable.add((v) => subscriber.next(v));

    return () => bjsObservable.remove(handler);
  });
}