import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

const DAY = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg';
const NIGHT = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png';
const CLOUDS = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png';

function Earth() {
  const m = useRef(), cl = useRef();
  const [day, night, clouds] = useMemo(() => {
    const l = new THREE.TextureLoader();
    return [l.load(DAY), l.load(NIGHT), l.load(CLOUDS)];
  }, []);
  useFrame((_, d) => {
    if (m.current) m.current.rotation.y += d * 0.08;
    if (cl.current) cl.current.rotation.y += d * 0.1;
  });
  return (
    <group>
      <mesh ref={m}>
        <sphereGeometry args={[1.5, 96, 96]} />
        <meshStandardMaterial map={day} emissiveMap={night}
          emissive={new THREE.Color(0xffaa33)} emissiveIntensity={0.6}
          roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh ref={cl}>
        <sphereGeometry args={[1.52, 64, 64]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.62, 64, 64]} />
        <meshBasicMaterial color={0x4da6ff} transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function makeLogo(type) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  if (type === 'youtube') {
    x.fillStyle = '#ff0000';
    const r = 40;
    x.beginPath();
    x.moveTo(r, 40);
    x.lineTo(256 - r, 40);
    x.quadraticCurveTo(256, 40, 256, 40 + r);
    x.lineTo(256, 216 - r);
    x.quadraticCurveTo(256, 216, 256 - r, 216);
    x.lineTo(r, 216);
    x.quadraticCurveTo(0, 216, 0, 216 - r);
    x.lineTo(0, 40 + r);
    x.quadraticCurveTo(0, 40, r, 40);
    x.closePath(); x.fill();
    x.fillStyle = '#fff';
    x.beginPath(); x.moveTo(100, 85); x.lineTo(100, 171); x.lineTo(180, 128); x.closePath(); x.fill();
  } else if (type === 'instagram') {
    const g = x.createRadialGradient(90, 60, 20, 170, 180, 240);
    g.addColorStop(0, '#feda75');
    g.addColorStop(0.3, '#fa7e1e');
    g.addColorStop(0.6, '#d62976');
    g.addColorStop(0.9, '#962fbf');
    g.addColorStop(1, '#4f5bd5');
    x.fillStyle = g;
    x.beginPath(); x.roundRect(20, 20, 216, 216, 56); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 12;
    x.beginPath(); x.roundRect(56, 56, 144, 144, 32); x.stroke();
    x.beginPath(); x.arc(128, 128, 34, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(182, 74, 10, 0, Math.PI * 2); x.fill();
  } else {
    x.fillStyle = '#000';
    x.beginPath(); x.arc(128, 128, 120, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#25f4ee'; x.font = 'bold 160px Arial';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('♪', 122, 130);
    x.fillStyle = '#fe2c55'; x.fillText('♪', 134, 138);
    x.fillStyle = '#fff'; x.fillText('♪', 128, 134);
  }
  return new THREE.CanvasTexture(c);
}

function Sat({ radius, speed, angle, type, scale = 0.75 }) {
  const ref = useRef();
  const tex = useMemo(() => makeLogo(type), [type]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + angle;
    ref.current.position.set(Math.cos(t) * radius, 0, Math.sin(t) * radius);
  });
  return (
    <sprite ref={ref} scale={[scale, scale, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  );
}

export default function OrbitScene() {
  return (
    <Canvas camera={{ position: [0, 1.5, 5.5], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={1.6} color={0xfff5e0} />
      <pointLight position={[-5, -3, -5]} intensity={0.4} color={0x4da6ff} />
      <Stars radius={80} depth={60} count={6000} factor={5} fade speed={0.3} />
      <Earth />
      <Sat radius={2.7} speed={0.6} angle={0} type="instagram" />
      <Sat radius={3.1} speed={0.45} angle={Math.PI * 0.8} type="youtube" scale={0.8} />
      <Sat radius={3.5} speed={0.35} angle={Math.PI * 1.5} type="tiktok" />
    </Canvas>
  );
}