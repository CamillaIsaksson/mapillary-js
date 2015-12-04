/// <reference path="../../typings/jasmine/jasmine.d.ts" />
/// <reference path="../../typings/threejs/three.d.ts" />

import * as THREE from "three";

import {Spatial} from "../../src/Geo";

describe("Spatial.rotationMatrix", () => {
    let spatial: Spatial;
    let epsilon: number = 10e-8;

    beforeEach(() => {
        spatial = new Spatial();
    });

    it("should return a rotation matrix rotating 90 degrees around the x-axis", () => {
        let angleAxis: number[] = [Math.PI / 2, 0, 0];

        let matrix: THREE.Matrix4 = spatial.rotationMatrix(angleAxis);

        let elements: Float32Array = matrix.elements;

        // elements is a column-major list
        expect(elements[0]).toBe(1);
        expect(elements[1]).toBe(0);
        expect(elements[2]).toBe(0);
        expect(elements[3]).toBe(0);
        expect(elements[4]).toBe(0);
        expect(elements[5]).toBeLessThan(epsilon);
        expect(elements[6]).toBe(1);
        expect(elements[7]).toBe(0);
        expect(elements[8]).toBe(0);
        expect(elements[9]).toBe(-1);
        expect(elements[10]).toBeLessThan(epsilon);
        expect(elements[11]).toBe(0);
        expect(elements[12]).toBe(0);
        expect(elements[13]).toBe(0);
        expect(elements[14]).toBe(0);
        expect(elements[15]).toBe(1);
    });
});

describe("Spatial.rotate", () => {
    let spatial: Spatial;
    let epsilon: number = 10e-8;

    beforeEach(() => {
        spatial = new Spatial();
    });

    it("should return a vector rotated 90 degrees around the x-axis", () => {
        let vector: number[] = [0, 0, 1];
        let angleAxis: number[] = [Math.PI / 2, 0, 0];

        let rotated: THREE.Vector3 = spatial.rotate(vector, angleAxis);

        // counter-clockwise rotation about the x-axis pointing towards the observer
        expect(rotated.x).toBe(0);
        expect(rotated.y).toBe(-1);
        expect(rotated.z).toBeLessThan(epsilon);
    });
});

describe("Spatial.opticalCenter", () => {
    let spatial: Spatial;
    let epsilon: number = 10e-8;

    beforeEach(() => {
        spatial = new Spatial();
    });

    it("should return the correct optical center", () => {
        let C: number[] = [1, 0, 0];

        // Random rotation by 120 degrees
        let r: THREE.Vector3 = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(2 * Math.PI / 3);
        let R: THREE.Matrix4 = spatial.rotationMatrix(r.toArray());

        // t = -RC
        let t: THREE.Vector3 = new THREE.Vector3().fromArray(C).applyMatrix4(R).multiplyScalar(-1);

        let opticalCenter: THREE.Vector3 = spatial.opticalCenter(r.toArray(), t.toArray());

        expect(opticalCenter.x).toBeCloseTo(C[0], epsilon);
        expect(opticalCenter.y).toBeCloseTo(C[1], epsilon);
        expect(opticalCenter.z).toBeCloseTo(C[2], epsilon);
    });

    it("should return the correct optical center", () => {
        let C: number[] = [54, 22, -34];

        // Random rotation by 60 degrees
        let r: THREE.Vector3 = new THREE.Vector3(-1, 1, -2).normalize().multiplyScalar(Math.PI / 3);
        let R: THREE.Matrix4 = spatial.rotationMatrix(r.toArray());

        // t = -RC
        let t: THREE.Vector3 = new THREE.Vector3().fromArray(C).applyMatrix4(R).multiplyScalar(-1);

        let opticalCenter: THREE.Vector3 = spatial.opticalCenter(r.toArray(), t.toArray());

        expect(opticalCenter.x).toBeCloseTo(C[0], epsilon);
        expect(opticalCenter.y).toBeCloseTo(C[1], epsilon);
        expect(opticalCenter.z).toBeCloseTo(C[2], epsilon);
    });
});

describe("Spatial.viewingDirection", () => {
    let spatial: Spatial;
    let epsilon: number = 10e-8;

    beforeEach(() => {
        spatial = new Spatial();
    });

    it("should return a viewing direction in the x-axis direction", () => {
        let rotation: number[] = [0, -Math.PI / 2, 0];

        let viewingDirection: THREE.Vector3 = spatial.viewingDirection(rotation);

        // counter-clockwise rotation about the y-axis pointing towards the observer
        expect(viewingDirection.x).toBeCloseTo(1, epsilon);
        expect(viewingDirection.y).toBeCloseTo(0, epsilon);
        expect(viewingDirection.z).toBeCloseTo(0, epsilon);
    });
});

describe('Spatial.wrap', () => {
    let spatial: Spatial;

    beforeEach(() => {
        spatial = new Spatial();
    });

    it("should not wrap when in interval", () => {
        let value: number = 0;
        let min: number = -1;
        let max: number = 1;

        let result = spatial.wrap(value, min, max);

        expect(result).toBe(value);
    });

    it("should wrap when below interval", () => {
        let value: number = -2.5;
        let min: number = -1;
        let max: number = 1;

        let result: number = spatial.wrap(value, min, max);

        expect(result).toBe(-0.5);
    });

    it("should wrap when above interval", () => {
        let value: number = 2;
        let min: number = -1;
        let max: number = 1;

        let result: number = spatial.wrap(value, min, max);

        expect(result).toBe(0);
    });

    it("should wrap repeatedly until within interval when above", () => {
        let value: number = 30;
        let min: number = -1;
        let max: number = 1;

        let result: number = spatial.wrap(value, min, max);

        expect(result).toBe(0);
    });

    it("should wrap repeatedly until within interval when below", () => {
        let value: number = -54.5;
        let min: number = -1;
        let max: number = 1;

        let result: number = spatial.wrap(value, min, max);

        expect(result).toBe(-0.5);
    });
});

describe('Spatial.wrap', () => {
    let spatial: Spatial;

    beforeEach(() => {
        spatial = new Spatial();
    });

    it("should be equal to itself when it is zero", () => {
        let angle: number = 0;

        let result: number = spatial.wrapAngle(angle);

        expect(result).toBe(angle);
    });

    it("should be equal to itself when it is below or equal to Pi", () => {
        let angle: number = Math.PI;

        let result: number = spatial.wrapAngle(angle);

        expect(result).toBe(angle);
    });

    it("should be equal to itself when it is above or equal to minus Pi", () => {
        let angle: number = -Math.PI;

        let result: number = spatial.wrapAngle(angle);

        expect(result).toBe(angle);
    });

    it("should be wrapped by two Pi when it is bigger than Pi", () => {
        let angle: number = 3 / 2 * Math.PI;

        let result: number = spatial.wrapAngle(angle);

        expect(result).toBe(angle - 2 * Math.PI);
    });

    it("should be wrapped by two Pi when it is smaller than Pi", () => {
        let angle: number = - 3 / 2 * Math.PI;

        let result: number = spatial.wrapAngle(angle);

        expect(result).toBe(angle + 2 * Math.PI);
    });
});

describe('Spatial.angleBetweenVector2', () => {
    let spatial: Spatial;
    let epsilon: number = 1e-8;

    beforeEach(() => {
        spatial = new Spatial();
    });

    it("should be zero", () => {
        let v1: number[] = [1, 1];
        let v2: number[] = [1, 1];

        let result: number = spatial.angleBetweenVector2(v1[0], v1[1], v2[0], v2[1]);

        expect(result).toBe(0);
    });

    it("should be 90 degrees", () => {
        let v1: number[] = [1, 1];
        let v2: number[] = [-1, 1];

        let result: number = spatial.angleBetweenVector2(v1[0], v1[1], v2[0], v2[1]);

        expect(result).toBeCloseTo(Math.PI / 2, epsilon);
    });

    it("should be minus 90 degrees", () => {
        let v1: number[] = [-1, 1];
        let v2: number[] = [1, 1];

        let result: number = spatial.angleBetweenVector2(v1[0], v1[1], v2[0], v2[1]);

        expect(result).toBeCloseTo(-Math.PI / 2, epsilon);
    });

    it("should be minus 45 degrees", () => {
        let v1: number[] = [1, -1];
        let v2: number[] = [0, -1];

        let result: number = spatial.angleBetweenVector2(v1[0], v1[1], v2[0], v2[1]);

        expect(result).toBeCloseTo(-Math.PI / 4, epsilon);
    });

    it("should be 180 degrees", () => {
        let v1: number[] = [-1, 0];
        let v2: number[] = [1, 0];

        let result: number = spatial.angleBetweenVector2(v1[0], v1[1], v2[0], v2[1]);

        expect(Math.abs(result)).toBeCloseTo(Math.PI, epsilon);
    });
});

describe('Spatial.relativeRotationAngle', () => {
    let spatial: Spatial;
    let epsilon: number = 1e-8;

    beforeEach(() => {
        spatial = new Spatial();
    });

    it("should be 0 degrees when there is no rotation", () => {
        let rotation1: number[] = [0, 0, 0];
        let rotation2: number[] = [0, 0, 0];

        let theta: number = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(0, epsilon);
    });

    it("should be 0 degrees when rotation is the same", () => {
        let rotation1: number[] = [Math.PI / 2, 0, 0];
        let rotation2: number[] = [Math.PI / 2, 0, 0];

        let theta = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(0, epsilon);
    });

    it("should be 45 degrees when rotating 45 degrees", () => {
        let rotation1: number[] = [Math.PI / 4, 0, 0];
        let rotation2: number[] = [Math.PI / 2, 0, 0];

        let theta = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(Math.PI / 4, epsilon);
    });

    it("should be 90 degrees when rotating 90 degrees around X-axis", () => {
        let rotation1: number[] = [Math.PI / 2, 0, 0];
        let rotation2: number[] = [Math.PI, 0, 0];

        let theta = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(Math.PI / 2, epsilon);
    });

    it("should be 90 degrees when rotating 90 degrees around Y-axis", () => {
        let rotation1: number[] = [0, Math.PI / 2, 0];
        let rotation2: number[] = [0, Math.PI, 0];

        let theta = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(Math.PI / 2, epsilon);
    });

    it("should be 90 degrees when rotating 90 degrees around Z-axis", () => {
        let rotation1: number[] = [0, 0, Math.PI / 2];
        let rotation2: number[] = [0, 0, Math.PI];

        let theta = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(Math.PI / 2, epsilon);
    });

    it("should be 180 degrees when rotating 180 degrees", () => {
        let rotation1: number[] = [0, 0, 0];
        let rotation2: number[] = [Math.PI, 0, 0];

        let theta = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(Math.PI, epsilon);
    });

    it("should be 90 degrees when rotating 90 degrees in negative direction", () => {
        let rotation1: number[] = [0, 0, 0];
        let rotation2: number[] = [-Math.PI / 2, 0, 0];

        let theta = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(Math.PI / 2, epsilon);
    });

    it("should be 180 degrees when rotating 180 degrees in negative direction", () => {
        let rotation1: number[] = [0, 0, 0]
        let rotation2: number[] = [-Math.PI, 0, 0]

        let theta = spatial.relativeRotationAngle(rotation1, rotation2)

        expect(theta).toBeCloseTo(Math.PI, epsilon);
    });

    it("should be 90 degrees when rotating 90 degrees in general direction", () => {
        let k1: number = Math.PI / Math.sqrt(3);
        let k2: number = Math.PI / Math.sqrt(12);
        let rotation1: number[] = [k1, k1, k1];
        let rotation2: number[] = [k2, k2, k2];

        let theta = spatial.relativeRotationAngle(rotation1, rotation2);

        expect(theta).toBeCloseTo(Math.PI / 2, epsilon);
    });
});
