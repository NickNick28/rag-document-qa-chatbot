"use client";

import React, { useRef, Suspense } from "react";
import { Lock, Hexagon, Cpu } from "lucide-react";
import { handleGoogleLogin } from "@/actions";

// --- 3D Libraries ---
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, OrbitControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";

// --- 3D Component: Tech Planet ---
const TechPlanet = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const atmosRef = useRef<THREE.Mesh>(null!);
  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 0.05;
    meshRef.current.rotation.x += delta * 0.01;
    atmosRef.current.rotation.y += delta * 0.03;
    atmosRef.current.rotation.z += delta * 0.02;
  });
  return (
    <group rotation={[0, 0, Math.PI / 6]}>
      <mesh ref={meshRef} scale={[2, 2, 2]}>
        <icosahedronGeometry args={[1, 12]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={0.8}
          wireframe={true}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>
      <mesh ref={atmosRef} scale={[2.2, 2.2, 2.2]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhongMaterial
          color="#3b82f6"
          opacity={0.1}
          transparent={true}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <Sparkles count={200} scale={5} size={2} speed={0.4} color={"orange"} />
    </group>
  );
};

// --- 3D Scene Wrapper ---
const Background3DScene = () => {
  return (
    <div className="absolute inset-0 z-0 bg-[#0f1115]">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 10, 10]} intensity={2} color="#f97316" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
        <Suspense fallback={null}>
          <TechPlanet />
          <Stars
            radius={100}
            depth={50}
            count={3000}
            factor={4}
            saturation={0}
            fade
            speed={1}
          />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.3}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Suspense>
        <fog attach="fog" args={["#0f1115", 5, 15]} />
      </Canvas>
    </div>
  );
};

// --- Main Page Component ---
const LoginPage = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans text-slate-200 relative overflow-hidden">
      <Background3DScene />

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="relative w-full max-w-md group">
        {/* Glow (แสงฟุ้งรอบๆ นิ่งๆ) */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/10 via-blue-500/10 to-orange-500/10 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>

        {/* Sharp Rim Light (ขอบแสงขาวบางๆ นิ่งๆ) */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-white/20 via-white/5 to-transparent rounded-2xl z-0 pointer-events-none"></div>


        {/* Main Glass Content */}
        <div
          className="relative z-10 
          bg-slate-950/10 /* ปรับจาก /30 เป็น /10 (ใสมาก) */
          backdrop-blur-xs /* ปรับจาก 2xl เป็น xl (เบลอน้อยลงนิดหน่อย เพื่อให้เห็นดาวข้างหลังชัดขึ้น) */
          border border-white/10 
          ring-1 ring-white/5 
          rounded-2xl 
          shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
          overflow-hidden
          /* Reflection Overlay */
          before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-transparent before:pointer-events-none before:z-20
        "
        >
          <div className="h-0.5 w-full bg-gradient-to-r from-orange-500/80 via-orange-300/80 to-transparent relative z-30"></div>

          <div className="p-8 md:p-12 relative z-30">
            {/* Header Section */}
            <div className="mb-10 text-center relative">
              {/* Icon Section */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                {/* Glass Container */}
                <div className="relative flex items-center justify-center w-full h-full bg-slate-900/50 border border-white/20 rounded-xl shadow-inner backdrop-blur-md overflow-hidden">
                  {/* Lock Icon with Pulse (Heartbeat) */}
                  <Lock
                    size={28}
                    className="text-orange-400 relative z-10 
                    drop-shadow-[0_0_12px_rgba(251,146,60,0.8)] 
                    animate-[pulse_3s_ease-in-out_infinite]"
                  />

                  {/* Subtle Background Glow behind lock */}
                  <div className="absolute inset-0 bg-orange-500/5 blur-md animate-pulse"></div>
                </div>

                {/* Satellite Elements - Floating Only */}
                <div className="absolute -top-3 -right-3 animate-[bounce_3s_infinite]">
                  <Hexagon
                    size={18}
                    className="text-slate-400/60 fill-slate-600/20 rotate-12"
                  />
                </div>
                <div className="absolute -bottom-3 -left-3 animate-[bounce_4s_infinite]">
                  <Cpu size={18} className="text-slate-400/60 -rotate-12" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-white tracking-tight mb-3 drop-shadow-md">
                Welcome Back
              </h1>
              <p className="text-sm text-slate-200 font-light drop-shadow-sm">
                กรุณาเข้าสู่ระบบ
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="px-4 py-1 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-full text-slate-300 font-medium">
                  Authentication
                </span>
              </div>
            </div>

            {/* Google Button */}
            <form action={handleGoogleLogin}>
              <button
                type="submit"
                className="cursor-pointer group/btn w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white/90 hover:bg-white text-slate-900 border border-transparent hover:border-orange-300/50 rounded-lg shadow-lg shadow-black/10 backdrop-blur-sm transition-all duration-300 ease-out transform hover:-translate-y-0.5 relative overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                <div className="p-1 bg-white rounded-full relative z-10">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </div>
                <span className="font-semibold tracking-wide relative z-10">
                  Sign in with Google
                </span>
                <span className="opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all duration-300 text-slate-400 relative z-10">
                  →
                </span>
              </button>
            </form>
          </div>
          <div className="bg-black/10 backdrop-blur-md p-4 text-center border-t border-white/5 relative z-30">
            <p className="text-xs text-slate-400/80 font-light tracking-wider">
              Developed by Division of Academic Affairs
            </p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 text-xs text-slate-500/80 font-mono z-10 mix-blend-plus-lighter">
        &copy; 2025 Naresuan University. All rights reserved.
      </div>
    </div>
  );
};

export default LoginPage;
