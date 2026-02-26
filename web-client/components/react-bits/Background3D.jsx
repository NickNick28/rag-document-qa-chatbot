import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

// ฟังก์ชันสร้างวัสดุ (Material) แบบกระจกฝ้าๆ ดูแพงๆ
const glassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.6, // ความหยาบ (ยิ่งมากยิ่งด้าน)
  transmission: 1, // ความโปร่งแสง (1 คือโปร่งสุด)
  thickness: 1.5, // ความหนาของกระจก
  ior: 1.5, // ดัชนีการหักเหแสง
  color: '#ffffff', // สีพื้นฐาน
  attenuationColor: '#1e40af', // สีที่อมอยู่ข้างใน (สีน้ำเงินเข้ม)
  attenuationDistance: 1, // ระยะที่สีเริ่มเข้ม
  transparent: true,
  opacity: 0.4, // ความทึบแสงโดยรวม (ปรับให้จางลง)
});

// รูปทรงเรขาคณิตชิ้นหนึ่ง
const GeometricShape = ({ position, scale, rotationSpeed = 0.002, colorAccent = false }) => {
  const meshRef = useRef();
  
  // ทำให้หมุนช้าๆ ตลอดเวลา
  useFrame(() => {
    if (meshRef.current) {
        meshRef.current.rotation.x += rotationSpeed;
        meshRef.current.rotation.y += rotationSpeed * 1.5;
    }
  });

  // ถ้าเป็นชิ้น Accent ให้ใช้สีส้มผสมนิดหน่อย
  const materialToUse = colorAccent 
    ? glassMaterial.clone() // clone เพื่อไม่ให้กระทบตัวอื่น
    : glassMaterial;
    
  if (colorAccent) {
      materialToUse.attenuationColor = new THREE.Color('#ea580c'); // สีส้ม
      materialToUse.opacity = 0.3;
  }

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.8}>
      <mesh ref={meshRef} position={position} scale={scale} material={materialToUse}>
        {/* Icosahedron เป็นทรงกลมเหลี่ยมๆ ดูเป็น Tech */}
        <icosahedronGeometry args={[1, 0]} /> 
      </mesh>
    </Float>
  );
};


const Background3D = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none h-full w-full">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }} gl={{ antialias: true, alpha: true }}>
        {/* แสงสว่างหลัก */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#60a5fa" /> {/* แสงรองสีฟ้า */}
        
        {/* สภาพแวดล้อมสะท้อนแสง (ช่วยให้กระจกดูสมจริง) */}
        <Environment preset="city" />

        {/* กลุ่มก้อนเรขาคณิต */}
        <group>
            {/* ชิ้นหลักสีน้ำเงิน/ขาว */}
            <GeometricShape position={[-2, 1, 0]} scale={[2, 2, 2]} />
            <GeometricShape position={[3, -1, -2]} scale={[1.5, 1.5, 1.5]} rotationSpeed={-0.003} />
            <GeometricShape position={[-3, -2, 1]} scale={[1, 1, 1]} />
            
            {/* ชิ้น Accent สีส้มจางๆ เล็กๆ */}
            <GeometricShape position={[1, 2, -1]} scale={[0.8, 0.8, 0.8]} rotationSpeed={0.004} colorAccent={true} />
        </group>
        
        {/* หมอกจางๆ สีขาว เพื่อให้วัตถุไกลๆ ดูกลืนไปกับพื้นหลัง */}
        <fog attach="fog" args={['#f8fafc', 5, 15]} /> 
      </Canvas>
    </div>
  );
};

export default Background3D;