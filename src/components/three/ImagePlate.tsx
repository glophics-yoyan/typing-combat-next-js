'use client';

import { forwardRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface ImageHeadProps {
    image_source: string;
}

function useLocalTexture(image_source: string, wrap_image = false) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        let active = true;
        let loaded_texture: THREE.Texture | null = null;
        const loader = new THREE.TextureLoader();
        loader.load(image_source, (next_texture) => {
            loaded_texture = next_texture;
            next_texture.colorSpace = THREE.SRGBColorSpace;
            next_texture.anisotropy = 4;
            if (wrap_image) {
                next_texture.wrapS = THREE.RepeatWrapping;
                next_texture.offset.x = .5;
            }
            if (active) setTexture(next_texture);
            else next_texture.dispose();
        });
        return () => {
            active = false;
            loaded_texture?.dispose();
        };
    }, [image_source, wrap_image]);

    return texture;
}

export function ImageHead({ image_source }: ImageHeadProps) {
    const texture = useLocalTexture(image_source);

    if (!texture) return null;

    return (
        <mesh>
            <boxGeometry args={[.7, .66, .32]} />
            {[0, 1, 2, 3, 5].map((material_index) => <meshStandardMaterial key={material_index} attach={`material-${material_index}`} color="#334b60" metalness={.35} roughness={.4} />)}
            <meshBasicMaterial attach="material-4" map={texture} toneMapped={false} />
        </mesh>
    );
}

export const ImageBagBody = forwardRef<THREE.MeshStandardMaterial, ImageHeadProps>(function ImageBagBody({ image_source }, ref) {
    const texture = useLocalTexture(image_source, true);

    if (!texture) return null;

    return (
        <mesh position={[0, .67, 0]}>
            <cylinderGeometry args={[.43, .47, 1.35, 48]} />
            <meshStandardMaterial ref={ref} attach="material-0" map={texture} emissive="#000000" roughness={.5} />
            <meshStandardMaterial attach="material-1" color="#293d50" metalness={.3} roughness={.45} />
            <meshStandardMaterial attach="material-2" color="#293d50" metalness={.3} roughness={.45} />
        </mesh>
    );
});
