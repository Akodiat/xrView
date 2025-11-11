/* global Peer */

import * as THREE from "three";

class Connection {
    constructor(scene, animations, animationMixers, log, callback) {
        this.scene = scene;
        this.animations = animations;
        this.animationMixers = animationMixers;
        this.log = log
        this.listeners = [];

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
                this.listeners.push(conn);

                this.sync(conn);
            });
        });
    }

    sendModelToPeers(modelData) {
        this.log(modelData)
        for (const conn of this.listeners) {
            conn.send(modelData);
        }
    }

    syncAll() {
        for (const conn of this.listeners) {
            this.sync(conn);
        }
    }

    sync(conn) {
        for (const c of this.scene.children) {
            const serializedObj = c.toJSON();
            let serializedAnimation;
            if (this.animations.has(c)) {
                serializedAnimation = this.animations.get(c).toJSON();
            }
            conn.send({
                type: "object",
                object: serializedObj,
                animation: serializedAnimation
            })
        }
    }

    getModelsFromPeer(destPeerId, onFile) {
        // We want to connect to a hosting client
        this.log(`Trying to connect to peer ${destPeerId}`);

        if (!this.peer) {
            this.log("Peer not started yet");
        }

        this.peer.on("error", err=>{
            this.log(err);
        })
        const conn = this.peer.connect(destPeerId, {reliable: true});

        conn.on('open', () => {
            this.log(`Connected to peer id ${destPeerId}`);
            // Receive messages
            conn.on('data', data => {
                this.log("Recieved data");
                if (data.type === "object") {

                    const loader = new THREE.ObjectLoader();
                    loader.parseAsync(data.object).then(object=>{
                        this.scene.add(object);
                        if (data.animation) {
                            const mixer = new THREE.AnimationMixer(object);
                            const animation = THREE.AnimationClip.parse(data.animation);
                            const action = mixer.clipAction(animation);
                            action.play();
                            this.animationMixers.push(mixer);
                            animations.set(model, animation);
                        }
                    }
                    );
                } else {
                    onFile(data);
                }
            });
        }).on('error', err=>{
            this.log("Error:");
            this.log(err);
        })
    }
}



export {Connection}
