'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';

export interface FighterRig {
    root: THREE.Group;
    torso: THREE.Group;
    head: THREE.Group;
    shoulders: THREE.Group[];
    elbows: THREE.Group[];
    hips: THREE.Group[];
    knees: THREE.Group[];
    core: THREE.MeshStandardMaterial;
    armor: THREE.MeshStandardMaterial;
}

export const CombatFighter = forwardRef<FighterRig, { color: string; mirrored: boolean }>(function CombatFighter({ color, mirrored }, ref) {
    const root_ref = useRef<THREE.Group>(null);
    const torso_ref = useRef<THREE.Group>(null);
    const head_ref = useRef<THREE.Group>(null);
    const shoulders_ref = useRef<THREE.Group[]>([]);
    const elbows_ref = useRef<THREE.Group[]>([]);
    const hips_ref = useRef<THREE.Group[]>([]);
    const knees_ref = useRef<THREE.Group[]>([]);
    const core_ref = useRef<THREE.MeshStandardMaterial>(null);
    const armor_ref = useRef<THREE.MeshStandardMaterial>(null);

    useImperativeHandle(ref, () => ({
        root: root_ref.current!, torso: torso_ref.current!, head: head_ref.current!,
        shoulders: shoulders_ref.current, elbows: elbows_ref.current,
        hips: hips_ref.current, knees: knees_ref.current,
        core: core_ref.current!, armor: armor_ref.current!,
    }));

    return (
        <group ref={root_ref} scale={[mirrored ? -1 : 1, 1, 1]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .025, 0]}>
                <ringGeometry args={[.53, .58, 40]} /><meshBasicMaterial color={color} transparent opacity={.55} />
            </mesh>
            <group ref={torso_ref} position={[0, 1.2, 0]}>
                <mesh><boxGeometry args={[.7, .72, .55]} /><meshStandardMaterial ref={armor_ref} color="#58738d" metalness={.2} roughness={.5} /></mesh>
                <mesh position={[.08, .04, .3]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[.21, .21, .05]} /><meshStandardMaterial ref={core_ref} color={color} emissive={color} emissiveIntensity={1} toneMapped={false} /></mesh>
                <mesh position={[-.38, .18, 0]}><boxGeometry args={[.13, .4, .65]} /><meshStandardMaterial color="#25394e" /></mesh>
                <group ref={head_ref} position={[.06, .72, 0]}>
                    <mesh><boxGeometry args={[.64, .57, .57]} /><meshStandardMaterial color="#8ea5b8" metalness={.2} roughness={.4} /></mesh>
                    <mesh position={[.16, .025, .3]}><boxGeometry args={[.41, .13, .035]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
                    <mesh position={[.33, .025, .05]}><boxGeometry args={[.035, .13, .5]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
                    <mesh position={[-.16, .32, 0]} rotation={[0, 0, -.35]}><coneGeometry args={[.15, .36, 4]} /><meshStandardMaterial color={color} /></mesh>
                </group>
                {[0, 1].map((index) => (
                    <group key={index} ref={(node) => { if (node) shoulders_ref.current[index] = node; }} position={[index ? -.05 : .1, .28, index ? -.4 : .4]} scale={[1, 1.15, 1]}>
                        <mesh><boxGeometry args={[.36, .34, .36]} /><meshStandardMaterial color={color} metalness={.15} roughness={.45} /></mesh>
                        <mesh position={[0, -.25, 0]}><boxGeometry args={[.22, .43, .24]} /><meshStandardMaterial color="#455c74" /></mesh>
                        <group ref={(node) => { if (node) elbows_ref.current[index] = node; }} position={[0, -.47, 0]}>
                            <mesh position={[0, -.2, 0]}><boxGeometry args={[.26, .4, .28]} /><meshStandardMaterial color="#728ba2" /></mesh>
                            <mesh position={[0, -.46, 0]}><boxGeometry args={[.32, .25, .33]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.15} /></mesh>
                        </group>
                    </group>
                ))}
            </group>
            {[0, 1].map((index) => (
                <group key={index} ref={(node) => { if (node) hips_ref.current[index] = node; }} position={[index ? -.16 : .16, .9, index ? -.2 : .2]}>
                    <mesh position={[0, -.2, 0]}><boxGeometry args={[.28, .42, .3]} /><meshStandardMaterial color="#506980" /></mesh>
                    <group ref={(node) => { if (node) knees_ref.current[index] = node; }} position={[0, -.4, 0]}>
                        <mesh position={[0, -.19, 0]}><boxGeometry args={[.27, .39, .31]} /><meshStandardMaterial color="#334b64" /></mesh>
                        <mesh position={[.13, -.36, 0]}><boxGeometry args={[.5, .18, .36]} /><meshStandardMaterial color="#8ba0b3" /></mesh>
                        <mesh position={[.1, -.07, .17]}><boxGeometry args={[.14, .2, .04]} /><meshBasicMaterial color={color} /></mesh>
                    </group>
                </group>
            ))}
        </group>
    );
});
