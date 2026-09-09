'use client';

import { Canvas } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface FighterProps {
  side: 'left' | 'right';
  hp: number;
  wpm: number;
  position: [number, number, number];
  isDominating: boolean;
  status: string;
}

function Fighter({ side, hp, wpm, position, isDominating, status }: FighterProps) {
  const fighter_ref = useRef<THREE.Group>(null);
  const aura_ref = useRef<THREE.Mesh>(null);
  const color = side === 'left' ? '#00ff88' : '#ff3366';
  const is_hurt = hp <= 30;
  const face_color = is_hurt ? '#ffb5a8' : isDominating ? '#fff0b0' : '#e9f1ff';

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const speed = status === 'active' ? 2 + wpm / 45 : 1;

    if (fighter_ref.current) {
      fighter_ref.current.position.y = position[1] + Math.sin(time * speed) * 0.08;
      fighter_ref.current.rotation.z = (isDominating ? (side === 'left' ? 0.1 : -0.1) : 0) + Math.sin(time * speed * 0.5) * 0.02;
    }
    if (aura_ref.current) {
      const aura_scale = 1 + Math.sin(time * speed * 1.5) * 0.1 + wpm / 500;
      aura_ref.current.scale.setScalar(aura_scale);
    }
  });

  return (
    <group ref={fighter_ref} position={position} rotation={[0, side === 'left' ? -0.15 : 0.15, 0]}>
      <pointLight color={color} intensity={0.8 + wpm / 80} distance={6} />
      <mesh ref={aura_ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.12, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <capsuleGeometry args={[0.52, 0.8, 8, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.6, 0.1]} castShadow>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial color={face_color} roughness={0.7} />
      </mesh>
      <mesh position={[-0.2, 1.72, 0.58]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color="#11131d" />
      </mesh>
      <mesh position={[0.2, 1.72, 0.58]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color="#11131d" />
      </mesh>
      <mesh position={[0, 1.42, 0.58]} rotation={[0, 0, is_hurt ? Math.PI : 0]}>
        <torusGeometry args={[0.16, 0.035, 8, 16, Math.PI]} />
        <meshBasicMaterial color={isDominating ? color : '#2b2036'} />
      </mesh>
      <mesh position={[-0.2, 1.96, 0.58]} rotation={[0, 0, is_hurt ? 0.25 : -0.25]}>
        <boxGeometry args={[0.26, 0.045, 0.04]} />
        <meshBasicMaterial color="#262035" />
      </mesh>
      <mesh position={[0.2, 1.96, 0.58]} rotation={[0, 0, is_hurt ? -0.25 : 0.25]}>
        <boxGeometry args={[0.26, 0.045, 0.04]} />
        <meshBasicMaterial color="#262035" />
      </mesh>
    </group>
  );
}

interface PowerEffectProps {
  leftPosition: number;
  rightPosition: number;
  pressure: number;
  status: string;
}

function PowerEffect({ leftPosition, rightPosition, pressure, status }: PowerEffectProps) {
  const orb_ref = useRef<THREE.Mesh>(null);
  const strength = Math.min(1, Math.abs(pressure));
  const is_left_attacking = pressure >= 0;
  const color = is_left_attacking ? '#00ff88' : '#ff3366';
  const center = (leftPosition + rightPosition) / 2;
  const distance = Math.max(1, Math.abs(rightPosition - leftPosition) - 1.3);

  useFrame((state) => {
    if (!orb_ref.current) return;
    const time = state.clock.elapsedTime;
    orb_ref.current.visible = status === 'active' && strength > 0.05;
    orb_ref.current.position.x = center + Math.sin(time * 2.8) * distance * 0.35 * (is_left_attacking ? 1 : -1);
    orb_ref.current.scale.setScalar(0.45 + strength * 0.55 + Math.sin(time * 10) * 0.08);
  });

  return (
    <group>
      {status === 'active' && strength > 0.05 && (
        <mesh position={[center, 1.25, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03 + strength * 0.06, 0.03 + strength * 0.06, distance, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      )}
      <mesh ref={orb_ref} position={[center, 1.25, 0]}>
        <icosahedronGeometry args={[0.45, 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[center, 1.25, 0]} color={color} intensity={2 + strength * 3} distance={7} />
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

export function BattleScene({
  myHp,
  opponentHp,
  myWpm,
  opponentWpm,
  myPosition,
  opponentPosition,
  textLength,
  isWinning,
  status,
}: BattleSceneProps) {
  const hp_pressure = (myHp - opponentHp) / 100;
  const progress_pressure = (myPosition - opponentPosition) / Math.max(1, textLength);
  const pressure = Math.max(-1, Math.min(1, hp_pressure * 0.7 + progress_pressure * 0.3));
  const push_offset = pressure * 1.45;
  const left_position: [number, number, number] = [-3.75 + push_offset, -0.55, 0];
  const right_position: [number, number, number] = [3.75 + push_offset, -0.55, 0];

  return (
    <div className="relative w-full max-w-3xl h-48 md:h-60 mx-auto mb-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[#080b16]">
      <Canvas
        camera={{ position: [0, 3, 14], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      >
        <fog attach="fog" args={["#0a0a0f", 5, 50]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#00ff88" />
        <pointLight position={[-5, 3, 2]} color="#00ff88" intensity={1.8} distance={12} />
        <pointLight position={[5, 3, 2]} color="#ff3366" intensity={1.8} distance={12} />

        <gridHelper args={[40, 40, "#1a1a2e", "#0f0f1a"]} position={[0, -2, 0]} />
        <mesh position={[0, -1.96, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[8.5, 64]} />
          <meshStandardMaterial color="#111a32" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, -1.94, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[6.8, 7.02, 64]} />
          <meshBasicMaterial color="#53618c" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>

        <Fighter
          side="left"
          hp={myHp}
          wpm={myWpm}
          position={left_position}
          isDominating={pressure > 0.1}
          status={status}
        />
        <Fighter
          side="right"
          hp={opponentHp}
          wpm={opponentWpm}
          position={right_position}
          isDominating={pressure < -0.1}
          status={status}
        />
        <PowerEffect
          leftPosition={left_position[0]}
          rightPosition={right_position[0]}
          pressure={pressure + (myWpm - opponentWpm) / 180}
          status={status}
        />

        {status === 'finished' && (
          <mesh position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[8, 64]} />
            <meshBasicMaterial
              color={isWinning ? "#00ff88" : "#ff3366"}
              transparent
              opacity={0.1}
              side={2}
            />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}
