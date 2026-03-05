/* eslint-disable react/no-unknown-property */
'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import './Lanyard.css';

// Assets - paths relative to page (about.html in same dir as lanyard folder)
// Note: + in filename must be encoded as %2B for URL
const lanyardTexture = 'lanyard/lanyard.png';
const cardFaceTexture = 'Group%2B74.webp';

extend({ MeshLineGeometry, MeshLineMaterial });

export default function Lanyard({ position = [0, 0, 10], gravity = [0, -40, 0], fov = 28, transparent = true, cardImage }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="lanyard-wrapper" style={{ height: '520px', width: '100%' }}>
      <Canvas
        camera={{ position, fov }}
        gl={{ alpha: transparent, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-3, 2, 2]} intensity={0.6} />
        <Physics gravity={gravity}>
          <Band maxSpeed={50} minSpeed={0} isMobile={isMobile} cardImage={cardImage || cardFaceTexture} />
        </Physics>
      </Canvas>
    </div>
  );
}

function Band({ maxSpeed = 50, minSpeed = 0, isMobile = false, cardImage }) {
  const band = useRef();
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();
  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const segmentProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: 4,
    linearDamping: 4,
  };
  const texture = useTexture(lanyardTexture);
  const cardTexture = useTexture(cardImage);
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.5, 0]]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }
    if (fixed.current) {
      [j1, j2].forEach((ref) => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(
          0.1,
          Math.min(1, ref.current.lerped.distanceTo(ref.current.translation()))
        );
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  // Use plane for reliable texture display (GLB UVs may not match our logo)
  return (
    <>
      <RigidBody ref={fixed} type="fixed" />
      <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="#00a854"
          resolution={[typeof window !== 'undefined' ? window.innerWidth : 800, typeof window !== 'undefined' ? window.innerHeight : 600]}
          lineWidth={0.5}
          map={texture}
        />
      </mesh>
      <RigidBody
        ref={card}
        type={dragged ? 'kinematicPosition' : 'dynamic'}
        onPointerEnter={() => hover(true)}
        onPointerOut={() => hover(false)}
        onPointerUp={(e) => (e.target.releasePointerCapture(e.pointerId), drag(false))}
        onPointerDown={(e) =>
          e.target.setPointerCapture(e.pointerId) ||
          drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
        }
      >
        <CuboidCollider args={[0.8, 1.125, 0.01]} />
        <mesh>
          <planeGeometry args={[1.6, 2.25]} />
          <meshPhysicalMaterial
            map={cardTexture}
            color="#ffffff"
            side={THREE.DoubleSide}
            clearcoat={0.3}
            clearcoatRoughness={0.2}
            metalness={0.05}
            roughness={0.4}
          />
        </mesh>
      </RigidBody>
    </>
  );
}
