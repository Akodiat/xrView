/* global Peer */

import * as THREE from "three";

class Connection {
    constructor(scene, models, animations, animationMixers, log, callback) {
        this.scene = scene;
        this.models = models;
        this.animations = animations;
        this.animationMixers = animationMixers;
        this.log = log
        this.peers = [];

        const peerId = localStorage.getItem("peerId");

        this.peer = new Peer(peerId);

        this.peer.on('open', id => {
            this.id = id;
            localStorage.setItem("peerId", id);
            this.log("Connection open");
            callback(id);
        });

        // When someone connects to us
        this.peer.on('connection', conn => {
            this.log("Connection attempt");
            conn.on('error', err=>{
                this.log("Connection error:");
                this.log(err);
            });
            conn.on('open', () => {
                this.log(`Peer ${conn.peer} connected to us`);
                this.peers.push(conn);

                this.sync([conn]);
            });
            conn.on('data', data => {
                if (data.type === "update") {
                    this.log("Recieved update data");
                    const object = this.scene.children.find(o=>o.uuid === data.uuid);
                    if (object) {
                        object.position.fromArray(data.position);
                        object.quaternion.fromArray(data.quaternion);
                        object.scale.fromArray(data.scale);
                        this.log("Found object to update")
                    }
                }
            });
        });
    }

    updateObject(object, connections = this.peers) {
        for (const conn of connections) {
            this.log(`Moving object at peer ${conn.peer}`);
            conn.send({
                type: "update",
                uuid: object.uuid,
                position: object.position.toArray(),
                quaternion: object.quaternion.toArray(),
                scale: object.scale.toArray()
            });
        }
    }

    sendObject(object, connections = this.peers) {
        const message = {
            type: "object",
            object: JSON.stringify(object.toJSON())
        }
        if (this.animations.has(object)) {
            message.animation = JSON.stringify(this.animations.get(object).toJSON());
        }
        for (const conn of connections) {
            this.log(`Sending object to peer ${conn.peer}`);
            conn.send(message);
        }
    }

    sync(connections = this.peers) {
        const serializedList = [];
        for (const c of this.scene.children) {
            const serialized = {
                object: JSON.stringify(c.toJSON())
            }
            if (this.animations.has(c)) {
                serialized.animation = JSON.stringify(this.animations.get(c).toJSON());
            }
            serializedList.push(serialized);
        }
        for (const conn of connections) {
            this.log(`Sending scene to peer ${conn.peer}`);
            conn.send({
                type: "sync",
                sceneData: serializedList
            })
        }
    }

    getModelsFromPeer(destPeerId) {
        // We want to connect to a hosting client
        this.log(`Trying to connect to peer ${destPeerId}`);

        if (!this.peer) {
            this.log("Peer not started yet");
        }

        this.peer.on("error", err=>{
            this.log(err);
        })
        const conn = this.peer.connect(destPeerId, {reliable: true});

        // If we want two-way communication
        this.peers.push(conn);

        conn.on('open', () => {
            this.log(`Connected to peer id ${destPeerId}`);
            // Receive messages
            conn.on('data', data => {
                if (data.type === "sync") {
                    this.log("Recieved sync data");
                    for (const d of data.sceneData) {
                        // TODO: remove any previous scene content before adding the new
                        addDataToScene(this.scene, this.models, d.object, d.animation, this.animationMixers, this.animations);
                    }
                } else if (data.type === "object") {
                    this.log("Recieved object data");
                    addDataToScene(this.scene, this.models, data.object, data.animation, this.animationMixers, this.animations);
                }
            });
        }).on('error', err=>{
            this.log("Error:");
            this.log(err);
        })
    }
}

const objectLoader = new THREE.ObjectLoader();

function addDataToScene(scene, models, serializedObject, serializedAnimation, animationMixers, animations) {
    objectLoader.parseAsync(JSON.parse(serializedObject)).then(object=>{
        scene.add(object);
        models.push(object);
        object.scaleWhenAdded = object.scale.clone();

        if (serializedAnimation) {
            const mixer = new THREE.AnimationMixer(object);
            const animation = THREE.AnimationClip.parse(JSON.parse(serializedAnimation));
            const action = mixer.clipAction(animation);
            action.play();
            animationMixers.push(mixer);
            animations.set(object, animation);
        }
    });
}



export {Connection}
