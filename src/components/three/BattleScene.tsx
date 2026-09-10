'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { ArenaArtwork } from '@/components/game/GameUI';
import { CombatFighter, type FighterRig } from './CombatFighter';
import { CombatEffects, type EffectRig } from './CombatEffects';
import { ATTACK_LABELS, IMPACT_PHASE, advanceTimeline, attackPhase, createTimeline, fighterPositions, getWordAttacks, strikeEnvelope, type CombatSnapshot } from './combat-timeline';

interface BattleSceneProps {
    quote_text: string;
    connected: boolean;
    status: string;
    winner: 'me' | 'opponent' | null;
    paused: boolean;
    my_position: number;
    opponent_position: number;
    my_mistakes: number;
    opponent_mistakes: number;
    my_hp: number;
    opponent_hp: number;
    particles_enabled: boolean;
}

function CombatWorld({ snapshot, cue_refs, effects_enabled }: { snapshot: CombatSnapshot; cue_refs: [RefObject<HTMLSpanElement | null>, RefObject<HTMLSpanElement | null>]; effects_enabled: boolean }) {
    const left_ref = useRef<FighterRig>(null);
    const right_ref = useRef<FighterRig>(null);
    const left_effect_ref = useRef<EffectRig>(null);
    const right_effect_ref = useRef<EffectRig>(null);
    const timeline_ref = useRef(createTimeline());
    const seen_attacks_ref = useRef([-1, -1]);
    useFrame(({ camera, size }) => {
        const view_camera = camera as THREE.OrthographicCamera;
        const zoom = Math.min(size.width / 8.6, size.height / 3.7);
        if (view_camera.zoom !== zoom) {
            view_camera.zoom = zoom;
            view_camera.updateProjectionMatrix();
        }
        camera.position.set(0, 1.45, 8);
        camera.lookAt(0, 1.2, 0);
        const now = performance.now() / 1000;
        const timeline = timeline_ref.current;
        advanceTimeline(timeline, snapshot, now);
        const rigs = [left_ref.current, right_ref.current];
        const effects = [left_effect_ref.current, right_effect_ref.current];
        if (!rigs[0] || !rigs[1] || !effects[0] || !effects[1]) return;
        const live = snapshot.connected && !snapshot.paused;
        const attacks = timeline.fighters.map((fighter) => {
            const phase = attackPhase(fighter, now);
            return fighter.attack ? strikeEnvelope(phase, IMPACT_PHASE[fighter.attack.kind]) : 0;
        });
        const recoils = timeline.fighters.map((fighter) => live ? Math.max(0, 1 - (now - fighter.hit_at) / .3) : 0);
        const pressure = (snapshot.players[0].hp - snapshot.players[1].hp) / 100 * .7
            + (snapshot.players[0].position - snapshot.players[1].position) / Math.max(1, snapshot.quote_text.length) * .3;
        const positions = fighterPositions(pressure, timeline.fighters[0].attack?.kind === 'throw' ? 0 : attacks[0], timeline.fighters[1].attack?.kind === 'throw' ? 0 : attacks[1], recoils[0], recoils[1]);
        const finish_phase = timeline.finished_at < 0 ? 0 : Math.min(1, (now - timeline.finished_at) / .9);

        rigs.forEach((nullable_rig, side) => {
            const rig = nullable_rig!;
            const fighter = timeline.fighters[side];
            const direction = side === 0 ? 1 : -1;
            const attack = fighter.attack;
            const strike = attacks[side];
            const phase = attackPhase(fighter, now);
            const recoil = recoils[side];
            const winner_side = snapshot.winner === 'me' ? 0 : 1;
            const won = snapshot.status === 'finished' && side === winner_side;
            const lost = snapshot.status === 'finished' && side !== winner_side;
            const idle = snapshot.status === 'active' && live ? Math.sin(now * 5) * .018 : 0;
            rig.root.position.set(positions[side], idle + (attack?.kind === 'kick' ? Math.max(0, strike) * .13 : 0), 0);
            rig.root.rotation.z = direction * (recoil * .17 + (lost ? finish_phase * .38 : 0));
            rig.torso.rotation.z = -Math.max(0, strike) * .15 + recoil * .18;
            rig.torso.rotation.y = attack?.kind === 'cross' ? strike * -.45 : 0;
            rig.head.rotation.z = recoil * .24 + (lost ? finish_phase * -.25 : 0);
            rig.shoulders.forEach((shoulder, index) => {
                shoulder.rotation.z = index ? .65 : .95;
                shoulder.rotation.x = 0;
                rig.elbows[index].rotation.z = 1.25;
                rig.hips[index].rotation.z = index ? -.14 : .14;
                rig.knees[index].rotation.z = -.12;
            });
            if (attack) {
                const arm_index = attack.kind === 'cross' ? 1 : 0;
                if (attack.kind === 'kick') {
                    rig.hips[0].rotation.z = Math.max(0, strike) * 1.6;
                    rig.knees[0].rotation.z = -.8 * (1 - Math.max(0, strike));
                    rig.shoulders[1].rotation.z = -.45 * strike;
                } else {
                    rig.shoulders[arm_index].rotation.z = .6 + strike * .95;
                    rig.elbows[arm_index].rotation.z = 1.25 * (1 - Math.max(0, strike));
                    if (attack.kind === 'throw') {
                        rig.shoulders[arm_index].rotation.z = phase < .2 ? 2.6 : .6 + strike;
                        rig.elbows[arm_index].rotation.z = phase < .2 ? 1 : .1;
                    }
                }
            }
            if (won) {
                rig.shoulders[1].rotation.z = THREE.MathUtils.lerp(rig.shoulders[1].rotation.z, 2.8, finish_phase);
                rig.elbows[1].rotation.z = THREE.MathUtils.lerp(rig.elbows[1].rotation.z, .4, finish_phase);
            }
            if (lost) {
                rig.root.position.y -= finish_phase * .22;
                rig.knees[0].rotation.z -= finish_phase * .55;
                rig.knees[1].rotation.z -= finish_phase * .55;
            }
            rig.core.emissiveIntensity = 1 + (live ? Math.max(0, fighter.charge_until - now) * 8 : 0);
            rig.armor.emissive.set(recoil > .45 ? '#ffffff' : '#000000');
            rig.armor.emissiveIntensity = recoil * .65;

            const cue = cue_refs[side].current;
            if (cue) {
                cue.textContent = snapshot.status === 'finished' ? won ? 'VICTORY POSE' : 'DEFEATED'
                    : !snapshot.connected ? 'CONNECTION LOST'
                    : attack ? ATTACK_LABELS[attack.kind] : 'GUARD';
            }
            const effect = effects[side]!;
            if (!effects_enabled) {
                effect.projectile.visible = false;
                effect.burst.visible = false;
                effect.slash.visible = false;
                effect.trail.forEach((trail) => { trail.visible = false; });
                return;
            }
            const target_side = side === 0 ? 1 : 0;
            const target = timeline.fighters[target_side];
            const target_x = positions[target_side] - direction * .4;
            const attack_changed = attack && attack.started_at !== seen_attacks_ref.current[side];
            if (attack_changed) {
                seen_attacks_ref.current[side] = attack.started_at;
                effect.setWord(attack.word);
            }
            const projectile_live = live && attack?.kind === 'throw' && phase >= .2 && phase < IMPACT_PHASE.throw;
            effect.projectile.visible = Boolean(projectile_live);
            const travel = (phase - .2) / (IMPACT_PHASE.throw - .2);
            const start_x = positions[side] + direction * .55;
            if (projectile_live) {
                effect.projectile.position.set(THREE.MathUtils.lerp(start_x, target_x, travel), 1.5 + Math.sin(travel * Math.PI) * .18, .45);
                effect.projectile.rotation.z = Math.sin(travel * 12) * .08;
            }
            effect.trail.forEach((trail, index) => {
                const melee_trail = live && attack && attack.kind !== 'throw' && phase > .2 && phase < .55;
                trail.visible = Boolean(projectile_live || melee_trail);
                if (melee_trail) {
                    trail.position.set(positions[side] - direction * (.3 + index * .13), .8 + index * .14, .2);
                    trail.scale.x = 1 + Math.max(0, strike) * 3;
                    (trail.material as THREE.MeshBasicMaterial).opacity = .5 - index * .06;
                    return;
                }
                if (!projectile_live) return;
                const trail_phase = Math.max(0, travel - index * .07);
                trail.position.set(THREE.MathUtils.lerp(start_x, target_x, trail_phase), 1.5 + Math.sin(trail_phase * Math.PI) * .18 + (index % 2 ? .12 : -.12), .2);
                trail.scale.x = 1 + index * .3;
                (trail.material as THREE.MeshBasicMaterial).opacity = .7 - index * .09;
            });
            effect.slash.visible = Boolean(live && attack && attack.kind !== 'throw' && phase > .22 && phase < .72);
            effect.slash.position.set(positions[side] + direction * .85, attack?.kind === 'kick' ? 1 : 1.5, .6);
            effect.slash.rotation.z = direction * (-phase * 4);
            effect.slash.scale.setScalar(attack?.kind === 'kick' ? 1.05 : .72);
            const hit_age = now - target.hit_at;
            const burst_live = live && hit_age >= 0 && hit_age < .32;
            effect.burst.visible = burst_live;
            if (burst_live) {
                const burst_phase = hit_age / .32;
                effect.burst.position.set(target_x, 1.45, .65);
                effect.ring.scale.setScalar(.12 + burst_phase * .85);
                (effect.ring.material as THREE.MeshBasicMaterial).opacity = (1 - burst_phase) * .9;
                effect.sparks.forEach((spark, index) => {
                    const angle = index / 12 * Math.PI * 2;
                    const radius = (.12 + burst_phase * 1.1) * (index % 2 ? 1 : .7);
                    spark.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
                    spark.rotation.z = angle;
                    spark.scale.x = 1 + burst_phase * 2;
                    (spark.material as THREE.MeshBasicMaterial).opacity = 1 - burst_phase;
                });
                effect.fragments.forEach((fragment, index) => {
                    fragment.visible = target.hit_kind === 'throw';
                    const angle = index / 6 * Math.PI * 2 + .3;
                    fragment.position.set(Math.cos(angle) * burst_phase * 1.2, Math.sin(angle) * burst_phase * .8 - burst_phase * burst_phase * .25, .05);
                    fragment.scale.setScalar(.22);
                    (fragment.material as THREE.SpriteMaterial).opacity = 1 - burst_phase;
                });
            }
        });
        const shake = live ? Math.max(...timeline.fighters.map((fighter) => ['kick', 'throw'].includes(fighter.hit_kind) ? Math.max(0, 1 - (now - fighter.hit_at) / .15) : 0)) : 0;
        camera.position.x = Math.sin(now * 95) * shake * .035;
        camera.position.y = 1.45 + Math.cos(now * 83) * shake * .025;
    });

    return (
        <>
            <ambientLight intensity={2} />
            <directionalLight position={[0, 5, 6]} intensity={3} />
            <pointLight position={[-3, 2, 2]} color="#68e4ef" intensity={5} />
            <pointLight position={[3, 2, 2]} color="#ff857c" intensity={5} />
            <gridHelper args={[18, 30, '#42627c', '#243d55']} position={[0, -.02, 0]} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.03, 0]}><planeGeometry args={[18, 14]} /><meshStandardMaterial color="#122337" roughness={.8} /></mesh>
            <CombatFighter ref={left_ref} color="#68e4ef" mirrored={false} />
            <CombatFighter ref={right_ref} color="#ff857c" mirrored />
            <CombatEffects ref={left_effect_ref} color="#68e4ef" />
            <CombatEffects ref={right_effect_ref} color="#ff857c" />
        </>
    );
}

class sceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { this.props.onFailure(); }
    render() { return this.state.failed ? <ArenaArtwork /> : this.props.children; }
}
const SceneBoundary = sceneBoundary;

export function BattleScene(props: BattleSceneProps) {
    const [render_3d, setRender3d] = useState(false);
    const [context_lost, setContextLost] = useState(false);
    const left_cue_ref = useRef<HTMLSpanElement>(null);
    const right_cue_ref = useRef<HTMLSpanElement>(null);
    const baseline_ref = useRef({ quote: '', connected: false, positions: [0, 0] });
    const cue_timers_ref = useRef<ReturnType<typeof setTimeout>[]>([]);
    const words = useMemo(() => getWordAttacks(props.quote_text), [props.quote_text]);
    const snapshot: CombatSnapshot = {
        quote_text: props.quote_text, status: props.status, connected: props.connected, winner: props.winner, paused: props.paused,
        players: [
            { position: props.my_position, mistakes: props.my_mistakes, hp: props.my_hp },
            { position: props.opponent_position, mistakes: props.opponent_mistakes, hp: props.opponent_hp },
        ],
    };

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

    useEffect(() => {
        if (render_3d && !context_lost) return;
        const baseline = baseline_ref.current;
        const positions = [props.my_position, props.opponent_position];
        const reset = baseline.quote !== props.quote_text || baseline.connected !== props.connected;
        [left_cue_ref.current, right_cue_ref.current].forEach((cue, side) => {
            if (!cue) return;
            const word = !reset ? words.filter((item) => item.end > baseline.positions[side] && item.end <= positions[side]).at(-1) : undefined;
            if (props.status === 'finished') {
                clearTimeout(cue_timers_ref.current[side]);
                cue.textContent = (props.winner === 'me' ? side === 0 : side === 1) ? 'VICTORY POSE' : 'DEFEATED';
            } else if (!props.connected) {
                clearTimeout(cue_timers_ref.current[side]);
                cue.textContent = 'CONNECTION LOST';
            } else if (word && props.status === 'active') {
                clearTimeout(cue_timers_ref.current[side]);
                cue.textContent = ATTACK_LABELS[word.kind];
                cue_timers_ref.current[side] = setTimeout(() => { cue.textContent = 'GUARD'; }, 800);
            } else if (reset || props.status !== 'active') cue.textContent = 'GUARD';
        });
        baseline_ref.current = { quote: props.quote_text, connected: props.connected, positions };
    }, [render_3d, context_lost, props.my_position, props.opponent_position, props.quote_text, props.connected, props.status, props.winner, words]);

    useEffect(() => {
        const timers = cue_timers_ref.current;
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className={'battle-scene anime-arena' + (props.status === 'finished' ? ' arena-finished' : '')} data-winner={props.winner} role="img" aria-label="Typing combat arena. Completed words trigger punches, kicks, and word projectiles.">
            <div className="combat-scene-label"><span>WORD COMBO / JAB → CROSS → KICK → BURST</span><span>TYPE TO FIGHT</span></div>
            {render_3d && !context_lost ? (
                <SceneBoundary onFailure={() => setContextLost(true)}>
                    <Canvas orthographic camera={{ position: [0, 1.45, 8], zoom: 65 }} dpr={[1, 1.5]} frameloop={props.paused ? 'demand' : 'always'} gl={{ antialias: true, alpha: true }} fallback={<ArenaArtwork />} onCreated={({ gl }) => {
                        gl.domElement.addEventListener('webglcontextlost', () => setContextLost(true), { once: true });
                    }}>
                        <CombatWorld snapshot={snapshot} cue_refs={[left_cue_ref, right_cue_ref]} effects_enabled={props.particles_enabled} />
                    </Canvas>
                </SceneBoundary>
            ) : <ArenaArtwork />}
            <div className="combat-cues" aria-hidden="true"><span ref={left_cue_ref}>GUARD</span><span ref={right_cue_ref}>GUARD</span></div>
        </div>
    );
}
