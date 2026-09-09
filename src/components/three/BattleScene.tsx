'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { ArenaArtwork } from '@/components/game/GameUI';

interface FighterProps {
    side: 'left' | 'right';
    hp: number;
    wpm: number;
    position: [number, number, number];
    status: string;
}

function Fighter({ side, hp, wpm, position, status }: FighterProps) {
    const fighter_ref = useRef<THREE.Group>(null);
    const color = side === 'left' ? '#68e4ef' : '#ff857c';
    const armor_color = hp <= 30 ? '#79525d' : '#57738b';

    useFrame((state) => {
        if (!fighter_ref.current) return;
        const time = state.clock.elapsedTime;
        fighter_ref.current.position.y = position[1] + Math.sin(time * (status === 'active' ? 2 + wpm / 80 : 1)) * 0.035;
        fighter_ref.current.rotation.z = status === 'active' ? (side === 'left' ? -0.06 : 0.06) : 0;
    });

    return (
        <group ref={fighter_ref} position={position} rotation={[0, side === 'left' ? .25 : -.25, 0]}>
            <pointLight color={color} intensity={1.5} distance={4} />
            <mesh position={[0, -.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[.85, .91, 48]} /><meshBasicMaterial color={color} transparent opacity={.65} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, .35, 0]}>
                <boxGeometry args={[1, .9, .6]} /><meshStandardMaterial color={armor_color} metalness={.7} roughness={.35} />
            </mesh>
            <mesh position={[0, .42, .32]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[.25, .25, .04]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
            </mesh>
            <mesh position={[0, 1.15, 0]}>
                <boxGeometry args={[.72, .65, .65]} /><meshStandardMaterial color="#465d70" metalness={.65} roughness={.3} />
            </mesh>
            <mesh position={[0, 1.17, .34]}>
                <boxGeometry args={[.64, .13, .04]} /><meshBasicMaterial color={color} />
            </mesh>
            {[-1, 1].map((direction) => (
                <group key={direction}>
                    <mesh position={[direction * .69, .65, 0]} rotation={[0, 0, direction * .14]}>
                        <boxGeometry args={[.35, .34, .73]} /><meshStandardMaterial color={color} metalness={.5} roughness={.4} />
                    </mesh>
                    <mesh position={[direction * .73, .1, 0]} rotation={[0, 0, direction * .12]}>
                        <boxGeometry args={[.3, .65, .45]} /><meshStandardMaterial color={armor_color} metalness={.6} roughness={.4} />
                    </mesh>
                    <mesh position={[direction * .3, -.4, 0]}>
                        <boxGeometry args={[.35, .65, .5]} /><meshStandardMaterial color="#2b3c50" metalness={.5} roughness={.5} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

interface BattleSceneProps {
    myHp: number;
    opponentHp: number;
    myWpm: number;
    opponentWpm: number;
    myPosition: number;
    opponentPosition: number;
    textLength: number;
    isWinning: boolean;
    status: string;
}

class sceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <ArenaArtwork /> : this.props.children; }
}
const SceneBoundary = sceneBoundary;

export function BattleScene({ myHp: my_hp, opponentHp: opponent_hp, myWpm: my_wpm, opponentWpm: opponent_wpm, myPosition: my_position, opponentPosition: opponent_position, textLength: text_length, status }: BattleSceneProps) {
    const [render_3d, setRender3d] = useState(false);
    const [context_lost, setContextLost] = useState(false);

    useEffect(() => {
        const motion_query = window.matchMedia('(prefers-reduced-motion: reduce)');
        let available = false;
        const canvas = document.createElement('canvas');
        try {
            const context = canvas.getContext('webgl2');
            available = Boolean(context);
            context?.getExtension('WEBGL_lose_context')?.loseContext();
        } catch { available = false; }
        function updateMotion() { setRender3d(available && !motion_query.matches); }
        updateMotion();
        motion_query.addEventListener('change', updateMotion);
        return () => motion_query.removeEventListener('change', updateMotion);
    }, []);

    const pressure = Math.max(-1, Math.min(1, (my_hp - opponent_hp) / 100 * .7 + (my_position - opponent_position) / Math.max(1, text_length) * .3));
    return (
        <div className="battle-scene" aria-hidden="true">
            {render_3d && !context_lost ? (
                <SceneBoundary>
                    <Canvas camera={{ position: [0, 1.6, 7], fov: 34 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} fallback={<ArenaArtwork />} onCreated={({ gl }) => {
                        gl.domElement.addEventListener('webglcontextlost', () => setContextLost(true), { once: true });
                    }}>
                        <ambientLight intensity={1.8} />
                        <directionalLight position={[3, 7, 5]} intensity={3} />
                        <pointLight position={[-4, 3, 2]} color="#68e4ef" intensity={3} />
                        <pointLight position={[4, 3, 2]} color="#ff857c" intensity={3} />
                        <gridHelper args={[30, 30, '#34546b', '#1b3043']} position={[0, -.75, 0]} />
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.76, 0]}>
                            <circleGeometry args={[6, 64]} /><meshStandardMaterial color="#101f30" metalness={.7} roughness={.4} />
                        </mesh>
                        <Fighter side="left" hp={my_hp} wpm={my_wpm} position={[-2.25 + pressure * .4, 0, 0]} status={status} />
                        <Fighter side="right" hp={opponent_hp} wpm={opponent_wpm} position={[2.25 + pressure * .4, 0, 0]} status={status} />
                        {status === 'active' && Math.abs(pressure) > .05 && <mesh position={[pressure, .5, 0]} rotation={[0, 0, Math.PI / 4]}><octahedronGeometry args={[.18, 0]} /><meshBasicMaterial color={pressure > 0 ? '#68e4ef' : '#ff857c'} /></mesh>}
                    </Canvas>
                </SceneBoundary>
            ) : <ArenaArtwork />}
        </div>
    );
}
