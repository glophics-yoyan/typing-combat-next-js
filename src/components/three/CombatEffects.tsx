'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';

export interface EffectRig {
    projectile: THREE.Group;
    burst: THREE.Group;
    ring: THREE.Mesh;
    sparks: THREE.Mesh[];
    fragments: THREE.Sprite[];
    trail: THREE.Mesh[];
    slash: THREE.Mesh;
    setWord: (word: string) => void;
}

// Each side owns a fixed projectile, six trails, twelve sparks and six letter fragments.
export const CombatEffects = forwardRef<EffectRig, { color: string }>(function CombatEffects({ color }, ref) {
    const projectile_ref = useRef<THREE.Group>(null);
    const burst_ref = useRef<THREE.Group>(null);
    const ring_ref = useRef<THREE.Mesh>(null);
    const slash_ref = useRef<THREE.Mesh>(null);
    const sparks_ref = useRef<THREE.Mesh[]>([]);
    const fragments_ref = useRef<THREE.Sprite[]>([]);
    const trail_ref = useRef<THREE.Mesh[]>([]);
    const material_ref = useRef<THREE.MeshBasicMaterial>(null);
    const texture_ref = useRef<THREE.CanvasTexture | null>(null);
    const fragment_texture_ref = useRef<THREE.CanvasTexture[]>([]);
    const word_ref = useRef('');

    useImperativeHandle(ref, () => ({
        projectile: projectile_ref.current!, burst: burst_ref.current!, ring: ring_ref.current!,
        sparks: sparks_ref.current, fragments: fragments_ref.current, trail: trail_ref.current,
        slash: slash_ref.current!,
        setWord(word: string) {
            if (word_ref.current === word) return;
            word_ref.current = word;
            texture_ref.current?.dispose();
            fragment_texture_ref.current.forEach((texture) => texture.dispose());
            fragment_texture_ref.current = [];
            function makeTexture(text: string, width: number) {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = 128;
                const context = canvas.getContext('2d');
                if (context) {
                    context.font = 'bold italic 64px monospace';
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillStyle = color;
                    context.shadowColor = color;
                    context.shadowBlur = 12;
                    context.fillText(text, width / 2, 64, width - 24);
                }
                const texture = new THREE.CanvasTexture(canvas);
                texture.colorSpace = THREE.SRGBColorSpace;
                return texture;
            }
            texture_ref.current = makeTexture(word, Math.min(1024, Math.max(128, word.length * 42 + 24)));
            if (material_ref.current) {
                material_ref.current.map = texture_ref.current;
                material_ref.current.needsUpdate = true;
            }
            fragments_ref.current.forEach((sprite, index) => {
                const texture = makeTexture(word[index % Math.max(1, word.length)] || '✦', 128);
                fragment_texture_ref.current.push(texture);
                const material = sprite.material as THREE.SpriteMaterial;
                material.map = texture;
                material.needsUpdate = true;
            });
        },
    }));

    useEffect(() => () => {
        texture_ref.current?.dispose();
        fragment_texture_ref.current.forEach((texture) => texture.dispose());
    }, []);

    return (
        <group>
            <group ref={projectile_ref} visible={false}>
                <mesh position={[0, 0, .35]}><planeGeometry args={[1.5, .42]} /><meshBasicMaterial ref={material_ref} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
                <mesh rotation={[0, 0, Math.PI / 4]}><octahedronGeometry args={[.2]} /><meshBasicMaterial color={color} wireframe toneMapped={false} /></mesh>
            </group>
            {Array.from({ length: 6 }, (_, index) => <mesh key={'trail-' + index} ref={(node) => { if (node) trail_ref.current[index] = node; }} visible={false}><boxGeometry args={[.28, .035, .035]} /><meshBasicMaterial color={color} transparent opacity={.6} depthWrite={false} toneMapped={false} /></mesh>)}
            <mesh ref={slash_ref} visible={false}><torusGeometry args={[.62, .025, 4, 24, Math.PI * 1.25]} /><meshBasicMaterial color={color} transparent opacity={.8} depthWrite={false} toneMapped={false} /></mesh>
            <group ref={burst_ref} visible={false}>
                <mesh ref={ring_ref}><ringGeometry args={[.82, .9, 36]} /><meshBasicMaterial color={color} transparent opacity={.8} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
                {Array.from({ length: 12 }, (_, index) => <mesh key={index} ref={(node) => { if (node) sparks_ref.current[index] = node; }}><boxGeometry args={[.2, .035, .02]} /><meshBasicMaterial color={index % 3 ? color : '#ffffff'} transparent depthWrite={false} toneMapped={false} /></mesh>)}
                {Array.from({ length: 6 }, (_, index) => <sprite key={'letter-' + index} ref={(node) => { if (node) fragments_ref.current[index] = node; }}><spriteMaterial transparent depthWrite={false} toneMapped={false} /></sprite>)}
            </group>
        </group>
    );
});
