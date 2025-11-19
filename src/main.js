import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {XRButton} from "three/addons/webxr/XRButton.js";
import {TransformControls} from "three/addons/controls/TransformControls.js";

import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {Connection} from "./connectivity.js";
import {createHands} from "./xrHands.js";

let canvas;
let camera, scene, renderer;
let hand1, hand2;

let clock;
const animationMixers = [];
const animations = new Map();

const raycaster = new THREE.Raycaster();

let orbitControls;
let transformControls;

const transformModes =  ["translate", "rotate", "scale"];

const scaling = {
    active: false,
    initialDistance: 0,
    object: null,
    initialScale: 1
};

const models = [];

let connection;

init();

function init() {

    canvas = document.getElementById("threeCanvas");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00000, 0);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3);

    // Setup orbit controls (to move camera)
    orbitControls = new OrbitControls(camera, canvas);
    orbitControls.target.set(0, 1.6, 0);
    orbitControls.update();

    // Setup transform controls (to translate, rotate, and scale models)
    transformControls = new TransformControls(camera, canvas);
    transformControls.addEventListener("dragging-changed", event => {
        orbitControls.enabled = ! event.value;
    });
    transformControls.addEventListener("objectChange", () => {
        connection.updateObject(transformControls.object);
    });
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", onDblclick)

    const transformGizmo = transformControls.getHelper();
    scene.add(transformGizmo);

    // Setup clock (for use in animation loop)
    clock = new THREE.Clock();

    const floorGeometry = new THREE.PlaneGeometry(4, 4);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Setup lights

    scene.add(new THREE.HemisphereLight(0xbcbcbc, 0xa5a5a5, 3));

    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(0, 6, 0);
    light.castShadow = true;
    light.shadow.camera.top = 2;
    light.shadow.camera.bottom = -2;
    light.shadow.camera.right = 2;
    light.shadow.camera.left = -2;
    light.shadow.mapSize.set(4096, 4096);
    scene.add(light);

    // Setup renderer

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true;

    const sessionInit = {
        optionalFeatures: ["hand-tracking", "unbounded"]
    };

    document.body.appendChild(
        XRButton.createButton(renderer, sessionInit)
    );

    [hand1, hand2] = createHands(renderer, scaling, scene, connection);
    scene.add(hand1);
    scene.add(hand2);

    window.addEventListener("resize", onWindowResize);

    const loader = new GLTFLoader();
    const modelInput = document.getElementById("modelInput");
    modelInput.onchange = () => {
        for (const uploadedFile of modelInput.files) {
            const url = URL.createObjectURL(uploadedFile);
            addModel(
                url, undefined, undefined, undefined,
                loader, false, ()=>URL.revokeObjectURL(url)
            );
        }
    };

    connection = new Connection(scene, models, animations, animationMixers,
        logText => {
            console.log(logText);
            document.getElementById("syncLog").innerHTML += `<p>${logText}</p>`;
        },
        id=>{
            const href = `${window.location.href.split("?")[0]}?peerId=${id}`;
            console.log(href);

            new QRCode(document.getElementById("qrcode"), href);

            const shareLink = document.getElementById("shareLink");
            shareLink.href = href;
            shareLink.innerHTML = href;

            document.getElementById("copyLinkButton").addEventListener(
                "click", () => navigator.clipboard.writeText(href)
            )

            checkUrlParameters(loader);
        }
    );


    window.addModel = addModel;
    window.models = models;
    window.THREE = THREE;
}

function checkUrlParameters(loader) {
    const paramsString = window.location.search;
    const searchParams = new URLSearchParams(paramsString);
    const modelPaths = searchParams.getAll("modelPath");
    const scales = searchParams.getAll("scale").map(s=>{
        const values = s.split(",").map(v=>parseFloat(v));
        if (values.length === 3) {
            return new THREE.Vector3().fromArray(values);
        }
        return values[0];
    });
    const positions = searchParams.getAll("position").map(s=>
        new THREE.Vector3().fromArray(s.split(",").map(v=>parseFloat(v)))
    );
    const quaternions = searchParams.getAll("quaternion").map(s=>
        new THREE.Quaternion().fromArray(s.split(",").map(v=>parseFloat(v)))
    );

    for (const i in modelPaths) {
        addModel(modelPaths[i], scales[i], positions[i], quaternions[i], loader, false);
    }

    searchParams.getAll("peerId").forEach(peerId=>
        connection.getModelsFromPeer(peerId)
    );
}

/**
 * Load a 3D model from path
 * @param {string} url Path to glTF 3D model
 * @param {THREE.Vector3 | number} scale
 * @param {THREE.Vector3} position
 * @param {THREE.Quaternion} quaternion
 * @param {GLTFLoader} loader
 * @param {boolean} updateUrlParams
 * @param {()=>void} callback Function to be run once the model is loaded
 */
function addModel(
    url,
    scale,
    position,
    quaternion,
    loader = new GLTFLoader(),
    updateUrlParams = true,
    callback=()=>{},
) {
    loader.load(url, gltf => {
        const model = gltf.scene;

        const params = new URLSearchParams(window.location.search);
        params.append("modelPath", url);

        // Apply transformations, if provided
        if (scale) {
            if (typeof(scale) === "number") {
                model.scale.setScalar(scale);
                params.append("scale", scale);
            } else {
                // Assume Vector3
                model.scale.copy(scale);
                params.append("scale", scale.toArray().join(","));
            }
        }
        if (position) {
            model.position.copy(position);
            params.append("position", position.toArray().join(","));
        }
        if (quaternion) {
            model.quaternion.copy(quaternion);
            params.append("quaterinon", quaternion.toArray().join(","));
        }

        model.scaleWhenAdded = model.scale.clone();

        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.geometry.computeBoundingSphere();
            }
        });

        scene.add(model);
        models.push(model);

        if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            const animation = gltf.animations[0];
            const action = mixer.clipAction(animation);
            action.play();
            animationMixers.push(mixer);
            animations.set(model, animation);
        }
        console.log("Model added");

        if (updateUrlParams) {
            window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
        }

        connection.sendObject(model);

        callback();
    }, undefined, e => {
        console.log("Failed to add model\n" + e);
        callback();
    });
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function onClick(event) {

    const pointer = new THREE.Vector2(
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

function onDblclick() {
    if (transformControls.object) {
        const modeIdx = transformModes.findIndex(m=>m === transformControls.getMode());
        transformControls.setMode(transformModes[(modeIdx+1) % (transformModes.length)]);
    }
}


function animate() {

    if (scaling.active) {
        const indexTip1Pos = hand1.joints["index-finger-tip"].position;
        const indexTip2Pos = hand2.joints["index-finger-tip"].position;
        const distance = indexTip1Pos.distanceTo(indexTip2Pos);
        const newScale = scaling.object.scaleWhenAdded.x * (scaling.initialScale + distance / scaling.initialDistance - 1);
        scaling.object.scale.setScalar(newScale);
    }

    const delta = clock.getDelta();
    for (const mixer of animationMixers) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
}