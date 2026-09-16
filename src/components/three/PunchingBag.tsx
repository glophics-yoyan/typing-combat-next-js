'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { ImageBagBody } from './ImagePlate';

export interface PunchingBagRig {
    root: THREE.Group;
    target: THREE.Group;
    padding: THREE.MeshStandardMaterial | null;
}

export const PunchingBag = forwardRef<PunchingBagRig, { target_image?: string | null }>(function PunchingBag({ target_image }, ref) {
    const root_ref = useRef<THREE.Group>(null);
    const target_ref = useRef<THREE.Group>(null);
    const padding_ref = useRef<THREE.MeshStandardMaterial>(null);

    useImperativeHandle(ref, () => ({
        root: root_ref.current!,
        target: target_ref.current!,
        get padding() { return padding_ref.current; },
    }));

    return (
        <group ref={root_ref}>
            <mesh position={[0, .12, 0]}><cylinderGeometry args={[.62, .72, .24, 32]} /><meshStandardMaterial color="#263b50" metalness={.45} roughness={.42} /></mesh>
            <mesh position={[0, .25, 0]}><cylinderGeometry args={[.48, .56, .08, 32]} /><meshStandardMaterial color="#ff857c" emissive="#ff857c" emissiveIntensity={.15} /></mesh>
            <mesh position={[0, .72, 0]}><cylinderGeometry args={[.1, .13, 1.05, 20]} /><meshStandardMaterial color="#526b80" metalness={.65} roughness={.3} /></mesh>
            <group ref={target_ref} position={[0, .7, 0]}>
                {target_image ? <ImageBagBody ref={padding_ref} image_source={target_image} /> : <>
                    <mesh position={[0, .67, 0]}><cylinderGeometry args={[.42, .46, 1.25, 32]} /><meshStandardMaterial ref={padding_ref} color="#943f46" emissive="#000000" roughness={.55} /></mesh>
                    <mesh position={[0, 1.295, 0]}><sphereGeometry args={[.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#943f46" roughness={.55} /></mesh>
                    <mesh position={[0, .045, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[.46, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#943f46" roughness={.55} /></mesh>
                    <mesh position={[0, .82, .43]}><boxGeometry args={[.48, .08, .035]} /><meshBasicMaterial color="#ffb0a9" toneMapped={false} /></mesh>
                    <mesh position={[0, .5, .445]}><ringGeometry args={[.12, .17, 24]} /><meshBasicMaterial color="#ffb0a9" toneMapped={false} /></mesh>
                </>}
            </group>
        </group>
    );
});
