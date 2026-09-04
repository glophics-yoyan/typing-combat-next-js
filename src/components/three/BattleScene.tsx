'use client';

import { Canvas } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

interface ParticleFieldProps {
  count: number;
  speed: number;
  color: string;
}

function ParticleField({ count, speed, color }: ParticleFieldProps) {
  const pointsRef = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }, [count, color]);

  useFrame((_, delta) => {
    const positions = pointsRef.geometry.attributes.position.array as Float32Array;
    const velocities = pointsRef.geometry.attributes.velocity.array as Float32Array;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3] * speed * delta * 60;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * speed * delta * 60;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * speed * delta * 60;

      if (positions[i * 3 + 2] > 10) positions[i * 3 + 2] = -30;
      if (positions[i * 3 + 2] < -30) positions[i * 3 + 2] = 10;
    }

    pointsRef.geometry.attributes.position.needsUpdate = true;
  });

  return <primitive object={pointsRef} />;
}

interface PlayerOrbProps {
  hp: number;
  position: [number, number, number];
  color: string;
}

function PlayerOrb({ hp, position, color }: PlayerOrbProps) {
  const meshRef = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }, [color]);

  useFrame((_, delta) => {
    meshRef.rotation.y += delta * 0.2;
    meshRef.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.1);
    meshRef.material.opacity = 0.2 + (hp / 100) * 0.4;
  });

  return (
    <group position={position}>
      <primitive object={meshRef} />
      <mesh
        geometry={new THREE.RingGeometry(1.2, 1.4, 32)}
        material={new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        })}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

interface BattleSceneProps {
  myHp: number;
  opponentHp: number;
  myWpm: number;
  isWinning: boolean;
  status: string;
}

export function BattleScene({ myHp, opponentHp, myWpm, isWinning, status }: BattleSceneProps) {
  const particleColor = isWinning ? '#00ff88' : '#ff3366';
  const particleSpeed = 0.5 + myWpm / 200;

  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 5, 15], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      >
        <fog attach="fog" args={["#0a0a0f", 5, 50]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 10, 5]} intensity={0.5} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#00ff88" />

        <gridHelper args={[40, 40, "#1a1a2e", "#0f0f1a"]} position={[0, -2, 0]} />

        <ParticleField count={1500} speed={particleSpeed} color={particleColor} />

        <PlayerOrb hp={myHp} position={[-6, 3, 0]} color="#00ff88" />
        <PlayerOrb hp={opponentHp} position={[6, 3, 0]} color="#ff3366" />

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