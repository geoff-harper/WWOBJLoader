import { Object3D, Vector3, Raycaster, ArrowHelper } from 'three';
import { OBJLoader2 } from 'wwobjloader2';
import { createThreeDefaultSetup, ExampleDefinition, renderDefault, reportProgress, ThreeDefaultSetup } from './ExampleCommons.js';

export class OBJLoader2BasicExample implements ExampleDefinition {

    private setup: ThreeDefaultSetup;

    constructor(elementToBindTo: HTMLElement | null) {
        const cameraDefaults = {
            posCamera: new Vector3(0.0, 200.0, 100.0).add(new Vector3(338034, 5569726, 81)),
            posCameraTarget: new Vector3(0, 0, 0).add(new Vector3(338034, 5569726, 81)),
            near: 0.1,
            far: 10000,
            fov: 45
        };

        this.setup = createThreeDefaultSetup(elementToBindTo, cameraDefaults);
    }

    getSetup() {
        return this.setup;
    }

    render() {
        renderDefault(this.setup);
    }

    run() {
        const modelName = 'female02';
        reportProgress({ detail: { text: 'Loading: ' + modelName } });

        const objLoader2 = new OBJLoader2();
        const callbackOnLoad = (object3d: Object3D) => {
            object3d.position.set(338034, 5569726, 81);
            this.setup.scene.add(object3d);
            reportProgress({
                detail: {
                    text: `Loading of [${modelName}] was successfully completed.`
                }
            });

            const rc = new Raycaster();
            rc.set(
                new Vector3(338002.263713, 5569813.333421, 81.170564 ),
                new Vector3( -0.02129193137495335,  -0.011798426121074434,  -0.9997036814973673)
            );
            setTimeout(() => {
                const result = rc.intersectObject(object3d);

                const ah = new ArrowHelper(rc.ray.direction, rc.ray.origin, 150);
                this.setup.scene.add(ah);
                console.log('result', result);
            }, 100);
        };

        // const onLoadMtl = (mtlParseResult: MTLLoader.MaterialCreator) => {
        objLoader2.setModelName(modelName);
        objLoader2.setLogging(true, true);
        // objLoader2.setMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult));
        objLoader2.load('./models/obj/main/geoff/model.obj', callbackOnLoad);
        // };

        // const mtlLoader = new MTLLoader();
        // mtlLoader.load('./models/obj/main/female02/female02.mtl', onLoadMtl);
    }

}
