# xrView
View 3D objects in webXR and sync the scene between devices.

| Try it out now at https://akodiat.github.io/xrView/ |
|-----------------------------------------------------|

A loaded scene can be syncronised between different devices using peer-to-peer connections. For example, this can be used to send data between a computer and a VR headset.

To connect to another instance, open the provided link (with a syncId) on the other device. Instead of typing the whole id into a headset, it is advisable to use a link shortener or (if possible) to scan the provided QR code. 

Open the page from the browser of a compatible XR headset (e.g. Meta Quest 3), click "Start XR".

Example scenes: 
 - [Horse and flamingo](https://akodiat.github.io/xrView/?modelPath=https%3A%2F%2Fthreejs.org%2Fexamples%2Fmodels%2Fgltf%2FHorse.glb&scale=0.01&position=0.75%2C0%2C0&modelPath=https%3A%2F%2Fthreejs.org%2Fexamples%2Fmodels%2Fgltf%2FFlamingo.glb&scale=0.011&position=-0.75%2C1.5%2C0)
 - [Protein](http://localhost:8080/?modelPath=https://raw.githubusercontent.com/gunterAlce/webar-tutorial/main/a1m.glb&scale=0.01&position=0,1,0)
 - [Cargoship](https://akodiat.github.io/xrView/?modelPath=https://raw.githubusercontent.com/akodiat/shipAhoy/main/resources/cargoship.glb&scale=0.01&position=0,1,0)

In non-VR mode, click a loaded model to transform it. Double-click to switch transformation mode.

In a supported headset, use your hands to grab and transform. 
