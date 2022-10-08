import {
	Object3D,
	Mesh,
	LineSegments,
	Points,
	MeshStandardMaterial
} from 'three';
import {
	WorkerTask,
	WorkerTaskMessage,
	DataPayload,
} from 'wtd-core';
import {
	MaterialUtils,
	MeshPayload,
	MaterialsPayload
} from 'wtd-three-ext';
import { OBJLoader2 } from './OBJLoader2';

/**
 * Creates a new OBJLoader2Parallel. Use it to load OBJ data from files or to parse OBJ data from arraybuffer.
 * It extends {@link OBJLoader2} with the capability to run the parser in a web worker.
 *
 * @param [LoadingManager] manager The loadingManager for the loader to use. Default is {@link LoadingManager}
 * @constructor
 */
export class OBJLoader2Parallel extends OBJLoader2 {

	static OBJLOADER2_PARALLEL_VERSION = OBJLoader2.OBJLOADER2_VERSION;
	static DEFAULT_DEV_MODULE_WORKER_PATH = './worker/OBJLoader2Worker.js';
	static DEFAULT_DEV_STANDARD_WORKER_PATH = '../lib/worker/OBJLoader2WorkerClassic.js';
	static DEFAULT_PROD_MODULE_WORKER_PATH = './worker/OBJLoader2WorkerModule.js';
	static DEFAULT_PROD_STANDARD_WORKER_PATH = './worker/OBJLoader2WorkerClassic.js';
	static TASK_NAME = 'OBJLoader2Worker';

	/**
	 *
	 * @param {LoadingManager} [manager]
	 */
	constructor(manager) {
		super(manager);
		this.moduleWorker = true;
		/** @type {URL} */
		this.workerUrl = OBJLoader2Parallel.getModuleWorkerDefaultUrl();
	}

	/**
	 * Set whether jsm modules in workers should be used. This requires browser support
	 * which is availableminall major browser apart from Firefox.
	 *
	 * @param {boolean} moduleWorker If the worker is a module or a standard worker
	 * @param {URL} workerUrl Provide complete worker URL otherwise relative path to this module may not be correct
	 * @return {OBJLoader2Parallel}
	 */
	setWorkerUrl(moduleWorker, workerUrl) {
		this.moduleWorker = moduleWorker === true;
		if (workerUrl === undefined || workerUrl === null || !(workerUrl instanceof URL)) {
			throw 'The provided URL for the worker is not valid. Aborting...';
		}
		else {
			this.workerUrl = workerUrl;
		}
		return this;
	}

	static getModuleWorkerDefaultUrl() {
		return new URL(import.meta.env.DEV ? OBJLoader2Parallel.DEFAULT_DEV_MODULE_WORKER_PATH : OBJLoader2Parallel.DEFAULT_PROD_MODULE_WORKER_PATH, import.meta.url);
	}

	static getStandardWorkerDefaultUrl() {
		return new URL(import.meta.env.DEV ? OBJLoader2Parallel.DEFAULT_DEV_STANDARD_WORKER_PATH : OBJLoader2Parallel.DEFAULT_PROD_STANDARD_WORKER_PATH, import.meta.url);
	}

	/**
	 * Request termination of worker once parser is finished.
	 *
	 * @param {boolean} terminateWorkerOnLoad True or false.
	 * @return {OBJLoader2Parallel}
	 */
	setTerminateWorkerOnLoad(terminateWorkerOnLoad) {
		this.terminateWorkerOnLoad = terminateWorkerOnLoad === true;
		return this;
	}

	/**
	 * See {@link OBJLoader2.load}
	 */
	load(content, onLoad, onFileLoadProgress, onError, onMeshAlter) {
		const scope = this;
		function interceptOnLoad(object3d, objectId) {
			if (object3d.name === 'OBJLoader2ParallelDummy') {
				if (scope.parser.logging.enabled && scope.parser.logging.debug) {
					console.debug('Received dummy answer from OBJLoader2Parallel#parse');
				}
			}
			else {
				onLoad(object3d, objectId);
			}
		}
		OBJLoader2.prototype.load.call(this, content, interceptOnLoad, onFileLoadProgress, onError, onMeshAlter);
	}

	/**
	 * See {@link OBJLoader2.parse}
	 * The callback onLoad needs to be set to be able to receive the content if used in parallel mode.
	 */
	parse(objToParse) {
		if (this.logging.enabled) {
			console.info('Using OBJLoader2Parallel version: ' + OBJLoader2Parallel.OBJLOADER2_PARALLEL_VERSION);
		}

		this._printCallbackConfig();
		this._initWorkerParse(objToParse);
		let dummy = new Object3D();
		dummy.name = 'OBJLoader2ParallelDummy';
		return dummy;
	}

	async _initWorkerParse(objToParse) {
		this._initWorkerTask();

		await this._initWorker()
			.then(() => {
				if (this.logging.debug) {
					console.log('OBJLoader2Parallel init was performed');
				}
				this._executeWorker(objToParse);

			}).catch(e => console.error(e));
	}

	_initWorkerTask() {
		this.workerTask = new WorkerTask(OBJLoader2Parallel.TASK_NAME, 1, {
			module: this.moduleWorker,
			blob: false,
			url: this.workerUrl
		}, this.logging.debug);
	}


	/**
	 * Provide instructions on what is to be contained in the worker.
	 *
	 * @return {Promise<void>}
	 * @private
	 */
	_initWorker() {
		const initMessage = new WorkerTaskMessage({
			cmd: 'init'
		});
		const dataPayload = new DataPayload();
		dataPayload.params = {
			logging: {
				enabled: this.logging.enabled,
				debug: this.logging.debug
			}
		};

		initMessage.addPayload(dataPayload);
		return this.workerTask.initWorker(initMessage);
	}

	async _executeWorker(objToParse) {
		const execMessage = new WorkerTaskMessage({
			cmd: 'execute',
			id: Math.floor(Math.random() * Math.floor(65536))
		});
		const dataPayload = new DataPayload();
		dataPayload.params = {
			modelName: this.modelName,
			useIndices: this.useIndices,
			disregardNormals: this.disregardNormals,
			materialPerSmoothingGroup: this.materialPerSmoothingGroup,
			useOAsMesh: this.useOAsMesh,
			objectId: this.objectId,
			logging: {
				enabled: this.logging.enabled,
				debug: this.logging.debug
			}
		};
		dataPayload.buffers.set('modelData', objToParse);
		dataPayload.params.materialNames = new Set(Array.from(this.materialStore.getMaterials().keys()));

		execMessage.addPayload(dataPayload);
		const transferables = execMessage.pack(false);

		await this.workerTask.executeWorker({
			message: execMessage,
			taskTypeName: OBJLoader2Parallel.TASK_NAME,
			onIntermediate: (message) => {
				this._onWorkerMessage(message);
			},
			onComplete: (message) => {
				this._onWorkerMessage(message);
				if (this.terminateWorkerOnLoad) {
					this.workerTask.dispose();
				}
			},
			transferables: transferables
		})
			.then(() => {
				console.log('Worker execution completed successfully.');
			})
			.catch(e => console.error(e));
	}

	/**
	 *
	 * @param {Mesh} mesh
	 * @param {object} materialMetaInfo
	 */
	_onWorkerMessage(message) {
		const wtm = WorkerTaskMessage.unpack(message, false);
		if (wtm.cmd === 'intermediate') {
			if (wtm.payloads.length === 1) {
				const dataPayload = wtm.payloads[0];
				this._buildThreeMesh(dataPayload.params.preparedMesh);
			}
			else {
				console.error('Received intermediate message without a payload');
			}
		}
		else if (wtm.cmd === 'execComplete') {
			this.objectId = wtm.id;
			this._onLoad();
		}
		else {
			console.error(`Received unknown command: ${cmd}`);
		}
	}
}