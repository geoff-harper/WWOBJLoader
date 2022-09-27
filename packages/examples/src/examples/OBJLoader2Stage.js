
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { GUI } from 'lil-gui';

import { OBJLoader2, MtlObjBridge } from 'wwobjloader2';
import { ResourceDescriptor } from '../ResourceDescriptor.js';
import {
	AssetPipelineLoader,
	AssetPipeline,
	AssetTask
} from '../AssetPipelineLoader.js';

export class OBJLoader2Stage {

	constructor(elementToBindTo) {
		this.renderer = null;
		this.canvas = elementToBindTo;
		this.aspectRatio = 1;
		this.recalcAspectRatio();

		this.scene = null;
		this.cameraDefaults = {
			posCamera: new THREE.Vector3(0.0, 175.0, 750.0),
			posCameraTarget: new THREE.Vector3(0, 0, 0),
			near: 0.1,
			far: 10000,
			fov: 45
		};
		this.camera = null;
		this.cameraTarget = this.cameraDefaults.posCameraTarget;

		this.controls = null;
		this.cube = null;

		this.pipelineLoaders = [];
		this.allAssets = [];
		this.processing = false;

		// Check for the various File API support.
		this.fileApiAvailable = true;
		if (window.File && window.FileReader && window.FileList && window.Blob) {

			console.log('File API is supported! Enabling all features.');

		} else {

			this.fileApiAvailable = false;
			console.warn('File API is not supported! Disabling file loading.');

		}
	}

	initGL() {
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			autoClear: true
		});
		this.renderer.setClearColor(0x0F0F0F);

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera(this.cameraDefaults.fov, this.aspectRatio, this.cameraDefaults.near, this.cameraDefaults.far);
		this.resetCamera();
		this.controls = new TrackballControls(this.camera, this.renderer.domElement);

		let ambientLight = new THREE.AmbientLight(0x404040);
		let directionalLight1 = new THREE.DirectionalLight(0xC0C090);
		let directionalLight2 = new THREE.DirectionalLight(0xC0C090);

		directionalLight1.position.set(-100, -50, 100);
		directionalLight2.position.set(100, 50, -100);

		this.scene.add(directionalLight1);
		this.scene.add(directionalLight2);
		this.scene.add(ambientLight);

		let helper = new THREE.GridHelper(1200, 60, 0xFF4444, 0x404040);
		this.scene.add(helper);

		let geometry = new THREE.BoxGeometry(10, 10, 10);
		let material = new THREE.MeshNormalMaterial();
		this.cube = new THREE.Mesh(geometry, material);
		this.cube.position.set(0, 0, 0);
		this.scene.add(this.cube);
	}

	resizeDisplayGL() {
		this.controls.handleResize();

		this.recalcAspectRatio();
		this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight, false);

		this.updateCamera();
	}

	recalcAspectRatio() {
		this.aspectRatio = (this.canvas.offsetHeight === 0) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
	}

	resetCamera() {
		this.camera.position.copy(this.cameraDefaults.posCamera);
		this.cameraTarget.copy(this.cameraDefaults.posCameraTarget);

		this.updateCamera();
	}

	updateCamera() {
		this.camera.aspect = this.aspectRatio;
		this.camera.lookAt(this.cameraTarget);
		this.camera.updateProjectionMatrix();
	}

	render() {
		if (!this.renderer.autoClear) this.renderer.clear();
		this.reloadAssets();

		this.controls.update();

		this.cube.rotation.x += 0.05;
		this.cube.rotation.y += 0.05;

		this.renderer.render(this.scene, this.camera);
	}

	initContent() {
		this.assetsDef = {
			objsMale: null,
			objsFemale: null,
			objsCerberus: null,
			objsWaltHead: null,
			objsNinja: null,
			objsPtv1: null,
			objsZomaxOven: null,
			objsZomaxSink: null
		};
		this.assetsDef.objsFemaleMale = [];


		let assetTaskMale02Mtl = new AssetTask('taskMale02Mtl');
		let resMale02 = new ResourceDescriptor('./models/obj/main/male02/male02.mtl').setNeedStringOutput(true);
		assetTaskMale02Mtl.setResourceDescriptor(resMale02);

		assetTaskMale02Mtl.setAssetHandler(new MTLLoader(), {
			resourcePath: './models/obj/main/male02/',
			materialOptions: {}
		});

		let assetTaskMale02MtlObjLink = new AssetTask('taskMale02MtlObjLink');
		assetTaskMale02MtlObjLink.setLinker(true);
		assetTaskMale02MtlObjLink.setAssetHandler(MtlObjBridge);

		let assetTaskMale02Obj = new AssetTask('taskMale02Obj');
		let resFemale02 = new ResourceDescriptor('./models/obj/main/male02/male02.obj');
		assetTaskMale02Obj.setResourceDescriptor(resFemale02);
		assetTaskMale02Obj.setAssetHandler(new OBJLoader2());

		let assetPipelineMale02 = new AssetPipeline();
		assetPipelineMale02.addAssetTask(assetTaskMale02Mtl);
		assetPipelineMale02.addAssetTask(assetTaskMale02MtlObjLink);
		assetPipelineMale02.addAssetTask(assetTaskMale02Obj);

		let aplMale02 = new AssetPipelineLoader('APL_Male02', assetPipelineMale02);
		let pivot = new THREE.Object3D();
		pivot.position.set(-200, 0, -175);
		this.scene.add(pivot);
		aplMale02.setBaseObject3d(pivot);
		this.assetsDef.objsMale = aplMale02;


		let assetTaskFemale02Mtl = new AssetTask('taskFemale02Mtl');
		let resFemale02Mtl = new ResourceDescriptor('./models/obj/main/female02/female02.mtl').setNeedStringOutput(true);
		assetTaskFemale02Mtl.setResourceDescriptor(resFemale02Mtl);
		assetTaskFemale02Mtl.setAssetHandler(new MTLLoader(), {
			resourcePath: './models/obj/main/female02/',
			materialOptions: {}
		});

		let assetTaskFemale02MtlObjLink = new AssetTask('taskFemale02MtlObjLink');
		assetTaskFemale02MtlObjLink.setLinker(true);
		assetTaskFemale02MtlObjLink.setAssetHandler(MtlObjBridge);

		let assetTaskFemale02Obj = new AssetTask('taskFemale02Obj');
		let resFemale02Obj = new ResourceDescriptor('./models/obj/main/female02/female02.obj');
		assetTaskFemale02Obj.setResourceDescriptor(resFemale02Obj);
		assetTaskFemale02Obj.setAssetHandler(new OBJLoader2());


		let assetPipelineFemale02 = new AssetPipeline();
		assetPipelineFemale02.addAssetTask(assetTaskFemale02Mtl);
		assetPipelineFemale02.addAssetTask(assetTaskFemale02MtlObjLink);
		assetPipelineFemale02.addAssetTask(assetTaskFemale02Obj);

		let aplFemale02 = new AssetPipelineLoader('APL_Female02', assetPipelineFemale02);
		pivot = new THREE.Object3D();
		pivot.position.set(200, 0, -75);
		this.scene.add(pivot);
		aplFemale02.setBaseObject3d(pivot);
		this.assetsDef.objsFemale = aplFemale02;


		let assetTaskPTV1Mtl = new AssetTask('taskPTV1Mtl');
		let resPTV1Mtl = new ResourceDescriptor('./models/obj/extra/PTV1/PTV1.mtl').setNeedStringOutput(true);
		assetTaskPTV1Mtl.setResourceDescriptor(resPTV1Mtl);
		assetTaskPTV1Mtl.setAssetHandler(new MTLLoader(), {
			resourcePath: './models/obj/PTV1/',
			materialOptions: {}
		});

		let assetTaskPTV1MtlObjLink = new AssetTask('taskPTV1MtlObjLink');
		assetTaskPTV1MtlObjLink.setLinker(true);
		assetTaskPTV1MtlObjLink.setAssetHandler(MtlObjBridge);

		let assetTaskPTV1Obj = new AssetTask('taskPTV1Obj');
		let resPTV1Obj = new ResourceDescriptor('./models/obj/extra/PTV1/PTV1.obj');
		assetTaskPTV1Obj.setResourceDescriptor(resPTV1Obj);
		assetTaskPTV1Obj.setAssetHandler(new OBJLoader2());

		let assetPipelinePTV1 = new AssetPipeline();
		assetPipelinePTV1.addAssetTask(assetTaskPTV1Mtl);
		assetPipelinePTV1.addAssetTask(assetTaskPTV1MtlObjLink);
		assetPipelinePTV1.addAssetTask(assetTaskPTV1Obj);

		let aplPTV1 = new AssetPipelineLoader('APL_PTV1', assetPipelinePTV1);
		pivot = new THREE.Object3D();
		pivot.position.set(-250, 0, -200);
		this.scene.add(pivot);
		aplPTV1.setBaseObject3d(pivot);
		this.assetsDef.objsPtv1 = aplPTV1;


		let assetTaskCerberusObj = new AssetTask('taskCerberusObj');
		let resCerberusObj = new ResourceDescriptor('./models/obj/main/cerberus/Cerberus.obj');
		assetTaskCerberusObj.setResourceDescriptor(resCerberusObj);
		assetTaskCerberusObj.setAssetHandler(new OBJLoader2(), {
			useIndices: true
		});
		let assetPipelineCerberus = new AssetPipeline();
		assetPipelineCerberus.addAssetTask(assetTaskCerberusObj);

		let aplCerberus = new AssetPipelineLoader('APL_Cerberus', assetPipelineCerberus);
		pivot = new THREE.Object3D();
		pivot.position.set(0, -100, 0);
		pivot.scale.set(50.0, 50.0, 50.0);
		this.scene.add(pivot);
		aplCerberus.setBaseObject3d(pivot);
		this.assetsDef.objsCerberus = aplCerberus;


		let assetTaskWaltHeadMtl = new AssetTask('taskWaltHeadMtl');
		let resWaltHeadMtl = new ResourceDescriptor('./models/obj/main/walt/WaltHead.mtl').setNeedStringOutput(true);
		assetTaskWaltHeadMtl.setResourceDescriptor(resWaltHeadMtl);
		assetTaskWaltHeadMtl.setAssetHandler(new MTLLoader(), {
			resourcePath: './models/obj/main/walt/',
			materialOptions: {}
		});

		let assetTaskWaltHeadMtlObjLink = new AssetTask('taskWaltHeadMtlObjLink');
		assetTaskWaltHeadMtlObjLink.setLinker(true);
		assetTaskWaltHeadMtlObjLink.setAssetHandler(MtlObjBridge);

		let assetTaskWaltHeadObj = new AssetTask('taskWaltHeadObj');
		let resWaltHeadObj = new ResourceDescriptor('./models/obj/main/walt/WaltHead.obj');
		assetTaskWaltHeadObj.setResourceDescriptor(resWaltHeadObj);
		assetTaskWaltHeadObj.setAssetHandler(new OBJLoader2(), {
			useIndices: true
		});
		let assetPipelineWaltHead = new AssetPipeline();
		assetPipelineWaltHead.addAssetTask(assetTaskWaltHeadMtl);
		assetPipelineWaltHead.addAssetTask(assetTaskWaltHeadMtlObjLink);
		assetPipelineWaltHead.addAssetTask(assetTaskWaltHeadObj);

		let aplWaltHead = new AssetPipelineLoader('APL_WaltHead', assetPipelineWaltHead);
		pivot = new THREE.Object3D();
		pivot.position.set(0, 0, 75);
		this.scene.add(pivot);
		aplWaltHead.setBaseObject3d(pivot);
		this.assetsDef.objsWaltHead = aplWaltHead;


		let assetTaskNinjaObj = new AssetTask('taskNinjaObj');
		let resNinjaObj = new ResourceDescriptor('./models/obj/main/ninja/ninjaHead_Low.obj');
		assetTaskNinjaObj.setResourceDescriptor(resNinjaObj);
		assetTaskNinjaObj.setAssetHandler(new OBJLoader2(), {
			useIndices: true
		});
		let assetPipelineNinja = new AssetPipeline();
		assetPipelineNinja.addAssetTask(assetTaskNinjaObj);


		let aplNinja = new AssetPipelineLoader('APL_Ninja', assetPipelineNinja);
		pivot = new THREE.Object3D();
		pivot.position.set(0, 0, 200);
		this.scene.add(pivot);
		aplNinja.setBaseObject3d(pivot);
		this.assetsDef.objsNinja = aplNinja;

		let assetTaskOvenObj = new AssetTask('taskOvenObj');
		let resOvenObj = new ResourceDescriptor('./models/obj/extra/zomax/zomax-net_haze-oven-scene.obj');

		assetTaskOvenObj.setResourceDescriptor(resOvenObj);
		assetTaskOvenObj.setAssetHandler(new OBJLoader2(), {
			useIndices: true,
			logging: {
				enabled: true,
				debug: true
			}
		});
		let assetPipelineOven = new AssetPipeline();
		assetPipelineOven.addAssetTask(assetTaskOvenObj);


		let aplOven = new AssetPipelineLoader('APL_Oven', assetPipelineOven);
		pivot = new THREE.Object3D();
		pivot.position.set(-200, 0, 50);
		this.scene.add(pivot);
		aplOven.setBaseObject3d(pivot);
		this.assetsDef.objsZomaxOven = aplOven;


		let assetTaskSinkObj = new AssetTask('taskSinkObj');
		let resSinkObj = new ResourceDescriptor('./models/obj/extra/zomax/zomax-net_haze-sink-scene.obj');

		assetTaskSinkObj.setResourceDescriptor(resSinkObj);
		assetTaskSinkObj.setAssetHandler(new OBJLoader2(), {
			useIndices: false
		});
		let assetPipelineSink = new AssetPipeline();
		assetPipelineSink.addAssetTask(assetTaskSinkObj);


		let aplSink = new AssetPipelineLoader('APL_Sink', assetPipelineSink);
		pivot = new THREE.Object3D();
		pivot.position.set(-200, 0, 200);
		this.scene.add(pivot);
		aplSink.setBaseObject3d(pivot);
		this.assetsDef.objsZomaxSink = aplSink;
	}

	clearAllAssests() {
		let storedObject3d;
		for (let asset in this.allAssets) {

			storedObject3d = this.allAssets[asset];
			let scope = this;
			let remover = function(object3d) {

				if (storedObject3d === object3d) return;

				console.log('Removing ' + object3d.name);
				scope.scene.remove(object3d);

				if (object3d.hasOwnProperty('geometry')) object3d.geometry.dispose();
				if (object3d.hasOwnProperty('material')) {

					let mat = object3d.material;
					if (mat.hasOwnProperty('materials')) {

						let materials = mat.materials;
						for (let name in materials) {

							if (materials.hasOwnProperty(name)) materials[name].dispose();

						}
					}
				}
				if (object3d.hasOwnProperty('texture')) object3d.texture.dispose();
			};
			if (storedObject3d !== undefined && storedObject3d !== null) {

				if (this.pivot !== storedObject3d) scope.scene.remove(storedObject3d);
				storedObject3d.traverse(remover);
				storedObject3d = null;

			}
		}
		this.allAssets = [];
	}

	updateAssets(prepData) {
		if (prepData !== undefined && prepData !== null) {

			if (!this.allAssets.hasOwnProperty(prepData.name)) {

				this.pipelineLoaders.push(prepData);

			} else {

				this._reportProgress({ detail: { text: 'Will not reload: ' + prepData.name } });

			}
		}
	}

	_reportProgress(event) {
		let output = (event.detail.text !== undefined && event.detail.text !== null) ? event.detail.text : '';
		console.log('Progress: ' + output);
		document.getElementById('feedback').innerHTML = output;
	}

	reloadAssets() {
		if (this.pipelineLoaders.length === 0 || this.processing) {

			return;

		} else {

			this.processing = true;

		}

		let pipelineLoader = this.pipelineLoaders[0];
		this.pipelineLoaders.shift();

		let scope = this;
		let loadAssetsProxy = function(pipelineName, result) {
			console.timeEnd(pipelineLoader.name);
			scope.processing = false;
			scope.allAssets[pipelineName] = result;
			scope.reloadAssets();
			scope._reportProgress({ detail: { text: '' } });
		};
		this._reportProgress({ detail: { text: '' } });

		pipelineLoader.setOnComplete(loadAssetsProxy);

		console.time(pipelineLoader.name);
		pipelineLoader.run();
	}

	_handleFileSelect(event, pathTexture) {
		let fileObj = null;
		let fileMtl = null;
		let files = event.target.files;

		for (let i = 0, file; file = files[i]; i++) {

			if (file.name.indexOf('\.obj') > 0 && fileObj === null) {
				fileObj = file;
			}

			if (file.name.indexOf('\.mtl') > 0 && fileMtl === null) {
				fileMtl = file;
			}

		}

		if (fileObj === undefined | fileObj === null) {
			alert('Unable to load OBJ file from given files.');
		}

		let assetTaskUserMtl = new AssetTask('taskUserMtl');
		let resUserMtl = new ResourceDescriptor(pathTexture + '/' + fileMtl.name).setNeedStringOutput(true);
		assetTaskUserMtl.setResourceDescriptor(resUserMtl);
		assetTaskUserMtl.setAssetHandler(new MTLLoader(), {
			resourcePath: pathTexture,
			materialOptions: {}
		});

		let assetTaskUserMtlObjLink = new AssetTask('taskUserMtlObjLink');
		assetTaskUserMtlObjLink.setLinker(true);
		assetTaskUserMtlObjLink.setAssetHandler(MtlObjBridge);

		let assetTaskUserObj = new AssetTask('taskUserObj');
		let resUserObj = new ResourceDescriptor(pathTexture + '/' + fileObj.name);
		assetTaskUserObj.setResourceDescriptor(resUserObj);
		assetTaskUserObj.setAssetHandler(new OBJLoader2(), {
			useIndices: true
		});
		let assetPipelineUser = new AssetPipeline();
		assetPipelineUser.addAssetTask(assetTaskUserMtl);
		assetPipelineUser.addAssetTask(assetTaskUserMtlObjLink);
		assetPipelineUser.addAssetTask(assetTaskUserObj);

		let aplUser = new AssetPipelineLoader('APL_WaltHead', assetPipelineUser);
		let userPivot = new THREE.Object3D();
		userPivot.position.set(
			-100 + 200 * Math.random(),
			-100 + 200 * Math.random(),
			-100 + 200 * Math.random()
		);
		this.scene.add(userPivot);
		aplUser.setBaseObject3d(userPivot);

		aplUser.run();
	}

	static executeExample(app) {
		// Init dat.gui and controls
		let elemFileInput = document.getElementById('fileUploadInput');
		let menuDiv = document.getElementById('dat');
		let gui = new GUI({
			autoPlace: false,
			width: 320
		});
		menuDiv.appendChild(gui.domElement);

		let folderOptions = gui.addFolder('OBJLoader2Stage Options');
		let handleMale, handleFemale, handleWalt, handleCerberus, handleNinja, handlePTV1, handleSink, handleOven;
		let wwOBJLoader2StageControl = {
			pathTexture: './models/obj/main/female02/',
			blockEvent: function(event) {
				event.stopPropagation();
			},
			enableElement: function(elementHandle) {
				elementHandle.domElement.removeEventListener('click', this.blockEvent, true);
				elementHandle.domElement.parentElement.style.pointerEvents = 'auto';
				elementHandle.domElement.parentElement.style.opacity = 1.0;
			},
			disableElement: function(elementHandle) {
				elementHandle.domElement.addEventListener('click', this.blockEvent, true);
				elementHandle.domElement.parentElement.style.pointerEvents = 'none';
				elementHandle.domElement.parentElement.style.opacity = 0.5;
			},
			loadMale: function() {
				app.updateAssets(app.assetsDef.objsMale);
				this.disableElement(handleMale);
			},
			loadFemale: function() {
				app.updateAssets(app.assetsDef.objsFemale);
				this.disableElement(handleFemale);
			},
			loadWaltHead: function() {
				app.updateAssets(app.assetsDef.objsWaltHead);
				this.disableElement(handleWalt);
			},
			loadCerberus: function() {
				app.updateAssets(app.assetsDef.objsCerberus);
				this.disableElement(handleCerberus);
			},
			loadNinja: function() {
				app.updateAssets(app.assetsDef.objsNinja);
				this.disableElement(handleNinja);
			},
			loadPTV1: function() {
				app.updateAssets(app.assetsDef.objsPtv1);
				this.disableElement(handlePTV1);
			},
			loadOven: function() {
				app.updateAssets(app.assetsDef.objsZomaxOven);
				this.disableElement(handleOven);
			},
			loadSink: function() {
				app.updateAssets(app.assetsDef.objsZomaxSink);
				this.disableElement(handleSink);
			},
			loadUserFiles: function() {
				elemFileInput.click();
			},
			clearAllAssests: function() {
				app.clearAllAssests();
				app.initContent();
				this.enableElement(handleMale);
				this.enableElement(handleFemale);
				this.enableElement(handleWalt);
				this.enableElement(handleCerberus);
				this.enableElement(handleNinja);
				this.enableElement(handlePTV1);
				this.enableElement(handleOven);
				this.enableElement(handleSink);
			}
		};
		handleMale = folderOptions.add(wwOBJLoader2StageControl, 'loadMale').name('Load Male');
		handleFemale = folderOptions.add(wwOBJLoader2StageControl, 'loadFemale').name('Load Female');
		handleWalt = folderOptions.add(wwOBJLoader2StageControl, 'loadWaltHead').name('Load Walt Head');
		handleCerberus = folderOptions.add(wwOBJLoader2StageControl, 'loadCerberus').name('Load Cerberus');
		handleNinja = folderOptions.add(wwOBJLoader2StageControl, 'loadNinja').name('Ninja');
		handlePTV1 = folderOptions.add(wwOBJLoader2StageControl, 'loadPTV1').name('PTV1');
		handleOven = folderOptions.add(wwOBJLoader2StageControl, 'loadOven').name('Oven');
		handleSink = folderOptions.add(wwOBJLoader2StageControl, 'loadSink').name('Sink');
		folderOptions.add(wwOBJLoader2StageControl, 'clearAllAssests').name('Clear Scene');
		folderOptions.open();

		let folderUserFiles = gui.addFolder('User Files');
		if (app.fileApiAvailable) {

			folderUserFiles.add(wwOBJLoader2StageControl, 'loadUserFiles').name('Load OBJ/MTL Files');
			let handleFileSelect = function(event) {
				app._handleFileSelect(event, wwOBJLoader2StageControl.pathTexture);
			};
			elemFileInput.addEventListener('change', handleFileSelect, false);

			let controlPathTexture = folderUserFiles.add(wwOBJLoader2StageControl, 'pathTexture').name('Relative path to textures');
			controlPathTexture.onChange(function(value) {
				console.log('Setting pathTexture to: ' + value);
				app.pathTexture = value + '/';
			});

		}


		let resizeWindow = function() {
			app.resizeDisplayGL();
		};

		let render = function() {
			requestAnimationFrame(render);
			app.render();
		};

		window.addEventListener('resize', resizeWindow, false);

		console.log('Starting initialisation phase...');
		app.initGL();
		app.resizeDisplayGL();
		app.initContent();

		wwOBJLoader2StageControl.loadMale();
		wwOBJLoader2StageControl.loadFemale();

		render();
	}
}
