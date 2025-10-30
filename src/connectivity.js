/* global Peer */
class Connection {
    constructor(callback) {
        this.peer = new Peer();
        this.listeners = [];

        this.peer.on('open', id => {
            this.id = id;
            //console.log('My peer ID is: ' + id);
            callback(id);
        });

        // When someone connects to us
        this.peer.on('connection', conn => {
            console.log("Connection!")
            conn.on('error', err=>{
                console.log("Error:");
                console.log(err);
            });
            conn.on('open', () => {
                console.log("Open");
                this.listeners.push(conn);
            });
        });
    }

    sendModelToPeers(modelData) {
        console.log(modelData)
        for (const conn of this.listeners) {
            conn.send(modelData);
        }
    }

    getModelsFromPeer(destPeerId, onFile) {
        // We want to connect to a hosting client
        console.log(`Trying to connect to peer ${destPeerId}`);
        const conn = this.peer.connect(destPeerId);

        conn.on('error', err=>{
            console.log("Error:");
            console.log(err);
        });

        conn.on('open', () => {
            console.log(`Connected to peer id ${destPeerId}`);
            // Receive messages
            conn.on('data', data => {
                console.log('Received', data);
                onFile(data);
            });
        });
    }
}



export {Connection}
