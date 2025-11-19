import {Box3, Vector3} from "three";
import {XRHandModelFactory} from "three/addons/webxr/XRHandModelFactory.js";

const handModelFactory = new XRHandModelFactory();
const tmpVector = new Vector3();


function createHands(renderer, scaling, scene, connection) {

    // Controllers need to be initialised for the "move" event to be sent
    renderer.xr.getController(0);
    renderer.xr.getController(1);

    const hand1 = renderer.xr.getHand(0);
    const hand2 = renderer.xr.getHand(1);

    setupHand(hand1, hand2, scaling, scene, connection);
    setupHand(hand2, hand1, scaling, scene, connection);

    return [hand1, hand2];
}

function setupHand(hand, otherHand, scaling, scene, connection) {
    hand.addEventListener("pinchstart", event => onPinchStart(
        event, hand, otherHand, scaling
    ));
    hand.addEventListener("pinchend", event => onPinchEnd(
        event, hand, scaling, scene
    ));
    hand.addEventListener("move", event => onHandMove(
        event, scene, connection
    ));
    hand.add(handModelFactory.createHandModel(hand));
    hand.userData.grabbing = false;
    return hand;
}

function collideObject(indexTip) {
    for (const object of models) {
        const box = new Box3();
        box.expandByObject(object, true);
        if (box.containsPoint(indexTip.getWorldPosition(tmpVector))) {
            return object;
        }
    }

    return null;
}

function onPinchStart(event, hand, otherHand, scaling) {
    const controller = event.target;
    const indexTip = controller.joints["index-finger-tip"];
    const object = collideObject(indexTip);

    if (otherHand.userData.grabbing) {
        if (object) {
            const object2 = otherHand.userData.selected;
            if (object === object2) {
                scaling.active = true;
                scaling.object = object;
                scaling.initialScale = object.scale.x / object.scaleWhenAdded.x;
                scaling.initialDistance = indexTip.position.distanceTo(otherHand.joints["index-finger-tip"].position);
                return;
            }
        }
    }
    if (object) {
        hand.userData.grabbing = true;
        indexTip.attach(object);
        controller.userData.selected = object;
    }
}


function onPinchEnd(event, hand, scaling, scene) {

    const controller = event.target;

    if (controller.userData.selected !== undefined) {

        const object = controller.userData.selected;
        scene.attach(object);

        controller.userData.selected = undefined;
        hand.userData.grabbing = false;
    }
    scaling.active = false;
}


function onHandMove(event, scene, connection) {
    const controller = event.target;
    const indexTip = controller.joints["index-finger-tip"];
    const object = controller.userData.selected;

    if (object !== undefined) {
        scene.attach(object);
        connection.updateObject(controller.userData.selected);
        indexTip.attach(object);
    }
}


export {createHands}