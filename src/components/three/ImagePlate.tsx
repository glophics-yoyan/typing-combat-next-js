'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';

interface ImagePlateProps {
    image_source: string;
    radius: number;
    position: [number, number, number];
}

export function ImagePlate({ image_source, radius, position }: ImagePlateProps) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        let active = true;
        let loaded_texture: THREE.Texture | null = null;
        const loader = new THREE.TextureLoader();
        loader.load(image_source, (next_texture) => {
            loaded_texture = next_texture;
            next_texture.colorSpace = THREE.SRGBColorSpace;
            next_texture.anisotropy = 4;
            if (active) setTexture(next_texture);
            else next_texture.dispose();
        });
        return () => {
            active = false;
            loaded_texture?.dispose();
        };
    }, [image_source]);

    if (!texture) return null;

    return (
        <group position={position}>
            <mesh position={[0, 0, -.006]}><ringGeometry args={[radius, radius + .035, 48]} /><meshStandardMaterial color="#d9e4ec" metalness={.5} roughness={.3} /></mesh>
            <mesh><circleGeometry args={[radius, 48]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
        </group>
    );
}
