/**
 * @author Kai Salmen / https://kaisalmen.de
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	BufferGeometry,
	BufferAttribute,
	Box3,
	Sphere,
	Texture,
	Material,
	MeshStandardMaterial,
	LineBasicMaterial,
	PointsMaterial,
	VertexColors
} from "../../../../../build/three.module.js";

/**
 * Define a base structure that is used to ship data in between main and workers.
 */
class StructuredWorkerMessage {

	/**
	 * Creates a new {@link StructuredWorkerMessage}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {

		this.main = {
			cmd: ( cmd !== undefined ) ? cmd : 'unknown',
			id: ( id !== undefined ) ? id : 0,
			type: 'undefined',
			/** @type {number} */
			progress: 0,
			params: {
			}
		};
		this.transferables = [];

	}

	/**
	 *
	 * @param {object.<string, *>} params
	 * @return {StructuredWorkerMessage}
	 */
	setParams( params ) {

		if ( params !== null && params !== undefined ) {
			this.main.params = params;
		}
		return this;

	}

	/**
	 *
	 * @return {*|{cmd: string, type: string, progress: {numericalValue: number}, params: {}}|{progress: number, cmd: (string|string), id: (string|number), type: string, params: {}}}
	 */
	getMain() {

		return this.main;

	}

	/**
	 *
	 * @return {[]|any[]|*}
	 */
	getTransferables() {

		return this.transferables;

	}

	/**
	 *
	 * @param {number} numericalValue
	 *
	 * @return {StructuredWorkerMessage}
	 */
	setProgress( numericalValue ) {

		this.main.progress = numericalValue;
		return this;

	}

	/**
	 * Posts a message by invoking the method on the provided object.
	 *
	 * @param {object} postMessageImpl
	 *
	 * @return {StructuredWorkerMessage}
	 */
	postMessage( postMessageImpl ) {

		postMessageImpl.postMessage( this.main, this.transferables );
		return this;

	}
}

class DataTransport extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link DataTransport}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {
		super( cmd );
		this.main.type = 'buffers';
		this.main.buffers = {};
	}

	/**
	 *
	 * @param name
	 * @param buffer
	 * @return {DataTransport}
	 */
	addBuffer ( name, buffer ) {
		this.main.buffers[ name ] = buffer;
		return this;
	}

	/**
	 * Package all data buffers
	 *
	 * @param {boolean} cloneBuffers
	 *
	 * @return {DataTransport}
	 */
	package( cloneBuffers ) {
		for ( let buffer of Object.values( this.main.buffers ) ) {
			this.addArrayBufferToTransferable( buffer, cloneBuffers );
		}
		return this;
	}

	/**
	 *
	 * @param buffer
	 * @param cloneBuffer
	 *
	 * @return {DataTransport}
	 */
	addArrayBufferToTransferable( buffer, cloneBuffer ) {
		if ( buffer !== null && buffer !== undefined ) {

			const potentialClone = cloneBuffer ? buffer.slice( 0 ) : buffer;
			this.transferables.push( potentialClone );

		}
		return this;
	}
}

/**
 * Define a structure that is used to ship materials data between main and workers.
 */
class MaterialsTransport extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link MeshMessageStructure}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {
		super( cmd );
		this.main.type = 'materials';
		this.main.materials = {};
		this.main.multiMaterials = {};
		this.main.cloneInstructions = {};
	}

	/**
	 *
	 * @param materials
	 */
	setMaterials ( materials ) {
		if ( materials !== undefined && materials !== null && Object.keys( materials ).length > 0 ) this.materials = materials;
	}

	/**
	 *
	 * @param {} materials
	 */
	cleanAndSetMaterials ( materials ) {
		let clonedMaterials = {};
		let clonedMaterial;
		for ( let material of Object.values( materials ) ) {

			if ( material instanceof Material ) {

				clonedMaterial = material.clone();
				Object.entries( clonedMaterial ).forEach( ( [key, value] ) => {
					if ( value instanceof Texture || value === null ) {
						clonedMaterial[ key ] = undefined;
					}
				} );
				clonedMaterials[ clonedMaterial.name ] = clonedMaterial;

			}

		}
		this.setMaterials( clonedMaterial );
	}

	package () {

		this.main.materials = MaterialStore.getMaterialsJSON( this.main.materials );

	}

	hasSingleMaterial () {

		return ( Object.keys( this.main.multiMaterials ).length === 0 );

	}

	getSingleMaterial () {

		return Object.entries( this.main.materials )[ 0 ][ 1 ];

	}

	/**
	 * Updates the materials with contained material objects (sync) or from alteration instructions (async).
	 *
	 * @param {Object.<string, Material>} materials
	 * @param {boolean} log
	 *
	 * @return {Material|Material[]}
	 */
	processMaterialTransport ( materials, log ) {

		Object.entries( this.main.cloneInstructions ).forEach( ( [ materialName, materialCloneInstructions ] ) => {
			if ( materialCloneInstructions ) {

				let materialNameOrg = materialCloneInstructions.materialNameOrg;
				materialNameOrg = (materialNameOrg !== undefined && materialNameOrg !== null) ? materialNameOrg : '';
				const materialOrg = materials[ materialNameOrg ];
				if ( materialOrg ) {

					let material = materialOrg.clone();
					Object.assign( material, materialCloneInstructions.materialProperties );
					MaterialStore.addMaterial( materials, material, materialName, true );

				}
				else {

					if ( log ) console.info( 'Requested material "' + materialNameOrg + '" is not available!' );

				}

			}

		} );

		let outputMaterial;
		if ( this.hasSingleMaterial() ) {

			outputMaterial = materials[ this.getSingleMaterial().name ];

		}
		else {

			// multi-material
			outputMaterial = [];
			Object.entries( this.main.multiMaterials ).forEach( ( [ index, materialName ] ) => {

				outputMaterial[ index ] = materials[ materialName ];

			} );

		}
		return outputMaterial;

	}
}

/**
 * Define a structure that is used to send geometry data between main and workers.
 */
class GeometryTransport extends StructuredWorkerMessage {

	/**
	 * Creates a new {@link GeometrySender}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {
		super( cmd, id );
		this.main.type = 'geometry';
		/**
		 * @type {number}
		 * 0: mesh, 1: line, 2: point
		 */
		this.main.geometryType = 0;
		/** @type {object} */
		this.main.geometry = {};
		/** @type {BufferGeometry} */
		this.main.bufferGeometry = null;
	}

	/**
	 *
	 * @param {object} transportObject
	 *
	 * @return {GeometryTransport}
	 */
	loadData( transportObject ) {
		this.main.cmd = transportObject.cmd;
		this.main.id = transportObject.id;
		return this.setGeometry( transportObject.geometry, transportObject.geometryType );
	}

	/**
	 * Only add the {@link BufferGeometry}
	 *
	 * @param {BufferGeometry} geometry
	 * @param {number} geometryType
	 *
	 * @return {GeometryTransport}
	 */
	setGeometry( geometry, geometryType ) {
		this.main.geometry = geometry;
		this.main.params.geometryType = geometryType;
		if ( geometry instanceof BufferGeometry ) this.main.bufferGeometry = geometry;

		return this;
	}

	/**
	 * Package {@link BufferGeometry}
	 *
	 * @param {boolean} cloneBuffers
	 *
	 * @return {GeometryTransport}
	 */
	package( cloneBuffers ) {
		const vertexBA = this.main.geometry.getAttribute( 'position' );
		const normalBA = this.main.geometry.getAttribute( 'normal' );
		const uvBA = this.main.geometry.getAttribute( 'uv' );
		const colorBA = this.main.geometry.getAttribute( 'color' );
		const skinIndexBA = this.main.geometry.getAttribute( 'skinIndex' );
		const skinWeightBA = this.main.geometry.getAttribute( 'skinWeight' );
		const indexBA = this.main.geometry.getIndex();

		this.addBufferAttributeToTransferable( vertexBA, cloneBuffers );
		this.addBufferAttributeToTransferable( normalBA, cloneBuffers );
		this.addBufferAttributeToTransferable( uvBA, cloneBuffers );
		this.addBufferAttributeToTransferable( colorBA, cloneBuffers );
		this.addBufferAttributeToTransferable( skinIndexBA, cloneBuffers );
		this.addBufferAttributeToTransferable( skinWeightBA, cloneBuffers );

		this.addBufferAttributeToTransferable( indexBA, cloneBuffers );

		return this;
	}

	/**
	 * @param {boolean} cloneBuffers
	 *
	 * @return {GeometryTransport}
	 */
	reconstruct( cloneBuffers ) {
		if ( this.main.bufferGeometry instanceof BufferGeometry ) return this;
		this.main.bufferGeometry = new BufferGeometry();

		const transferredGeometry = this.main.geometry;
		this.assignAttribute( transferredGeometry.attributes.position, 'position', cloneBuffers );
		this.assignAttribute( transferredGeometry.attributes.normal, 'normal', cloneBuffers );
		this.assignAttribute( transferredGeometry.attributes.uv, 'uv', cloneBuffers );
		this.assignAttribute( transferredGeometry.attributes.color, 'color', cloneBuffers );
		this.assignAttribute( transferredGeometry.attributes.skinIndex, 'skinIndex', cloneBuffers );
		this.assignAttribute( transferredGeometry.attributes.skinWeight, 'skinWeight', cloneBuffers );

		const index = transferredGeometry.index;
		if ( index !== null && index !== undefined ) {

			const indexBuffer = cloneBuffers ? index.array.slice( 0 ) : index.array;
			this.main.bufferGeometry.setIndex( new BufferAttribute( indexBuffer, index.itemSize, index.normalized ) );

		}
		const boundingBox = transferredGeometry.boundingBox;
		if ( boundingBox !== null ) this.main.bufferGeometry.boundingBox = Object.assign( new Box3(), boundingBox );

		const boundingSphere = transferredGeometry.boundingSphere;
		if ( boundingSphere !== null ) this.main.bufferGeometry.boundingSphere = Object.assign( new Sphere(), boundingSphere );

		this.main.bufferGeometry.uuid = transferredGeometry.uuid;
		this.main.bufferGeometry.name = transferredGeometry.name;
		this.main.bufferGeometry.type = transferredGeometry.type;
		this.main.bufferGeometry.groups = transferredGeometry.groups;
		this.main.bufferGeometry.drawRange = transferredGeometry.drawRange;
		this.main.bufferGeometry.userData = transferredGeometry.userData;

		return this;
	}

	/**
	 *
	 * @return {BufferGeometry|null}
	 */
	getBufferGeometry() {
		return this.main.bufferGeometry
	}

	/**
	 *
	 * @param input
	 * @param cloneBuffer
	 *
	 * @return {GeometryTransport}
	 */
	addBufferAttributeToTransferable( input, cloneBuffer ) {
		if ( input !== null && input !== undefined ) {

			const arrayBuffer = cloneBuffer ? input.array.slice( 0 ) : input.array;
			this.transferables.push( arrayBuffer.buffer );

		}
		return this;
	}

	/**
	 *
	 * @param attr
	 * @param attrName
	 * @param cloneBuffer
	 *
	 * @return {GeometryTransport}
	 */
	assignAttribute( attr, attrName, cloneBuffer ) {
		if ( attr ) {
			const arrayBuffer = cloneBuffer ? attr.array.slice( 0 ) : attr.array;
			this.main.bufferGeometry.setAttribute( attrName, new BufferAttribute( arrayBuffer, attr.itemSize, attr.normalized ) );
		}
		return this;
	}

}

class MeshTransport extends GeometryTransport {

	/**
	 * Creates a new {@link MeshTransport}.
	 *
	 * @param {string} [cmd]
	 * @param {string} [id]
	 */
	constructor( cmd, id ) {
		super( cmd, id );

		this.main.type = 'mesh';
		// needs to be added as we cannot inherit from both materials and geometry
		this.main.materialsTransport = new MaterialsTransport();
	}

	/**
	 *
	 * @param {object} transportObject
	 *
	 * @return {MeshTransport}
	 */
	loadData( transportObject ) {
		super.loadData( transportObject );
		this.main.meshName = transportObject.meshName;
		this.main.materialsTransport = Object.assign( new MaterialsTransport(), transportObject.materialsTransport );

		return this;
	}

	/**
	 * Only set the material.
	 *
	 * @param {MaterialsTransport} materialsTransport
	 *
	 * @return {MeshTransport}
	 */
	setMaterialsTransport( materialsTransport ) {

		if ( materialsTransport instanceof MaterialsTransport ) this.main.materialsTransport = materialsTransport;
		return this;

	}

	/**
	 * @return {MaterialsTransport}
	 */
	getMaterialsTransport() {

		return this.main.materialsTransport;

	}

	/**
	 *
	 * @param {Mesh} mesh
	 * @param {number} geometryType
	 *
	 * @return {MeshTransport}
	 */
	setMesh( mesh, geometryType ) {
		this.main.meshName = mesh.name;
		super.setGeometry( mesh.geometry, geometryType );

		return this;
	}

	/**
	 * Package {@link Mesh}
	 *
	 * @param {boolean} cloneBuffers
	 *
	 * @return {MeshTransport}
	 */
	package( cloneBuffers ) {
		super.package( cloneBuffers );
		if ( this.main.materialsTransport !== null ) this.main.materialsTransport.package();

		return this;
	}

	/**
	 * @param {boolean} cloneBuffers
	 *
	 * @return {MeshTransport}
	 */
	reconstruct( cloneBuffers ) {
		super.reconstruct( cloneBuffers );

		// so far nothing needs to be done for material

		return this;
	}

}

/**
 * Utility class that helps to transform meshes and especially {@link BufferGeometry} to message with transferables.
 * Structure that is used to ship data in between main and workers is defined {@link MeshMessageStructure}.
 */
class TransferableUtils {



}

class MaterialCloneInstruction {

	/**
	 *
	 * @param {string} materialNameOrg
	 * @param {string} newMaterialName
	 * @param {boolean} haveVertexColors
	 * @param {number} smoothingGroup
	 */
	constructor ( materialNameOrg, newMaterialName, haveVertexColors, smoothingGroup ) {
		this.materialNameOrg = materialNameOrg;
		this.materialProperties = {
			name: newMaterialName,
			vertexColors: haveVertexColors ? 2 : 0,
			flatShading: smoothingGroup === 0
		};
	}

}

class MaterialStore {

	constructor( createDefaultMaterials ) {

		this.logging = {
			enabled: false,
			debug: false
		};
		this.materials = {};

		if ( createDefaultMaterials ) {

			const defaultMaterial = new MeshStandardMaterial( { color: 0xDCF1FF } );
			defaultMaterial.name = 'defaultMaterial';

			const defaultVertexColorMaterial = new MeshStandardMaterial( { color: 0xDCF1FF } );
			defaultVertexColorMaterial.name = 'defaultVertexColorMaterial';
			defaultVertexColorMaterial.vertexColors = VertexColors;

			const defaultLineMaterial = new LineBasicMaterial();
			defaultLineMaterial.name = 'defaultLineMaterial';

			const defaultPointMaterial = new PointsMaterial( { size: 0.1 } );
			defaultPointMaterial.name = 'defaultPointMaterial';

			this.materials[ defaultMaterial.name ] = defaultMaterial;
			this.materials[ defaultVertexColorMaterial.name ] = defaultVertexColorMaterial;
			this.materials[ defaultLineMaterial.name ] = defaultLineMaterial;
			this.materials[ defaultPointMaterial.name ] = defaultPointMaterial;

		}

	}

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging ( enabled, debug ) {

		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;

	}

	/**
	 * Set materials loaded by any supplier of an Array of {@link Material}.
	 *
	 * @param newMaterials Object with named {@link Material}
	 * @param forceOverrideExisting boolean Override existing material
	 */
	addMaterials ( newMaterials, forceOverrideExisting ) {

		if ( newMaterials === undefined || newMaterials === null ) newMaterials = {};
		if ( Object.keys( newMaterials ).length > 0 ) {

			let material;
			for ( const materialName in newMaterials ) {

				material = newMaterials[ materialName ];
				MaterialStore.addMaterial( this.materials, material, materialName, forceOverrideExisting === true );

			}

		}

	}

	/**
	 *
	 * @param {object} materialsObject
	 * @param {Material|MaterialCloneInstruction} material
	 * @param {string} materialName
	 * @param {boolean} force
	 * @param {boolena} [log]
	 */
	static addMaterial( materialsObject, material, materialName, force, log ) {
		let existingMaterial;
		if ( ! force ) {

			existingMaterial = materialsObject[ materialName ];
			if ( existingMaterial ) {

				if ( existingMaterial.uuid !== existingMaterial.uuid ) {

					if ( log ) console.log( 'Same material name "' + existingMaterial.name + '" different uuid [' + existingMaterial.uuid + '|' + material.uuid + ']' );

				}

			} else {

				materialsObject[ materialName ] = material;
				if ( log ) console.info( 'Material with name "' + materialName + '" was added.' );

			}

		} else {

			materialsObject[ materialName ] = material;
			if ( log ) console.info( 'Material with name "' + materialName + '" was forcefully overridden.' );

		}
	}

	/**
	 * Returns the mapping object of material name and corresponding material.
	 *
	 * @returns {Object} Map of {@link Material}
	 */
	getMaterials () {

		return this.materials;

	}

	/**
	 *
	 * @param {String} materialName
	 * @returns {Material}
	 */
	getMaterial ( materialName ) {

		return this.materials[ materialName ];

	}

	/**
	 * Returns the mapping object of material name and corresponding jsonified material.
	 *
	 * @returns {Object} Map of Materials in JSON representation
	 */
	getMaterialsJSON () {

		return MaterialStore.getMaterialsJSON( this.materials );

	}

	static getMaterialsJSON ( materialsObject ) {

		const materialsJSON = {};
		let material;
		for ( const materialName in materialsObject ) {

			material = materialsObject[ materialName ];
			if ( material instanceof Material ) materialsJSON[ materialName ] = material.toJSON();

		}
		return materialsJSON;

	}

	/**
	 * Removes all materials
	 */
	clearMaterials () {

		this.materials = {};

	}

}

class ObjectManipulator {

	/**
	 * Applies values from parameter object via set functions or via direct assignment.
	 *
	 * @param {Object} objToAlter The objToAlter instance
	 * @param {Object} params The parameter object
	 * @param {boolean} forceCreation Force the creation of a property
	 */
	static applyProperties ( objToAlter, params, forceCreation ) {

		// fast-fail
		if ( objToAlter === undefined || objToAlter === null || params === undefined || params === null ) return;

		let property, funcName, values;
		for ( property in params ) {

			funcName = 'set' + property.substring( 0, 1 ).toLocaleUpperCase() + property.substring( 1 );
			values = params[ property ];

			if ( typeof objToAlter[ funcName ] === 'function' ) {

				objToAlter[ funcName ]( values );

			} else if ( objToAlter.hasOwnProperty( property ) || forceCreation ) {

				objToAlter[ property ] = values;

			}

		}

	}

}

export {
	TransferableUtils,
	StructuredWorkerMessage,
	DataTransport,
	GeometryTransport,
	MeshTransport,
	MaterialsTransport,
	MaterialStore,
	MaterialCloneInstruction,
	ObjectManipulator
}
