
import {Vector2, Raycaster} from "three";

const raycaster = new Raycaster();
const transformModes =  ["translate", "rotate", "scale"];

/**
 * Attach transform controls when a model is clicked
 * @param {Event} event
 * @param {THREE.TransformControls} transformControls
 * @param {THREE.Camera} camera
 * @param {THREE.Object[]} models
 */
function onClick(event, transformControls, camera, models) {

    const pointer = new Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        - (event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(models);

    if (intersects.length > 0) {
        let object = intersects[0].object;
        while (!models.includes(object) && object.parent) {
            object = object.parent;
        }
        if (object !== transformControls.object) {
            transformControls.attach(object);
        }
    } else {
        if (!transformControls.dragging) {
            transformControls.detach();
        }
    }
}

/**
 * Update transform mode on double click (if controls are active)
 * @param {THREE.TransformControls} transformControls
 */
function onDblclick(transformControls) {
    if (transformControls.object) {
        const modeIdx = transformModes.findIndex(m=>m === transformControls.getMode());
        transformControls.setMode(transformModes[(modeIdx+1) % (transformModes.length)]);
    }
}

export {onClick, onDblclick}