"use client";

import React, { useState } from "react";
import { useRef } from "react";
import { useInView } from "framer-motion";
import Link from "next/link";
import {
  Bot,
  Search,
  ShieldCheck,
  Zap,
  BookOpen,
  Users,
  ArrowRight,
  MessageSquare,
  FileText,
  Cpu,
  Building2,
  MapPinned,
  ArrowUpRight,
} from "lucide-react";

// --- Imports ---
import VerticalScrollList from "@/components/react-bits/VerticalScrollList";
import DecryptedText from "@/components/react-bits/DecryptedText";
import ShinyText from "@/components/react-bits/ShinyText";
import SpotlightCard from "@/components/react-bits/SpotlightCard";
import CountUp from "@/components/react-bits/CountUp";
// Import ตัว ScrollReveal ที่สร้างใหม่
import ScrollReveal from "@/components/react-bits/ScrollReveal"; // <-- อย่าลืมแก้ path ให้ตรง
import TypewriterText from "@/components/react-bits/TypewriterText";
import AnimatedIcon from "@/components/react-bits/AnimatedIcon";
// --- Import 3D Background ---
import Background3D from "@/components/react-bits/Background3D";
import QSMap from "@/components/react-bits/Map";
import ContactPopover from "@/components/react-bits/ContactPopover";

const FormalLandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { margin: "0px 0px -200px 0px" });

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 selection:bg-orange-100 selection:text-orange-900 relative overflow-x-hidden">
      {/* Navigation (คงเดิม) */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-900 to-slate-800 p-2 rounded-lg shadow-md">
                <Cpu className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <span className="block text-xl font-bold text-slate-900 tracking-tight">
                  NU.Knowledge<span className="text-orange-600">AI</span>
                </span>
                <span className="text-xs text-slate-500 font-medium tracking-wider">
                  Enterprise Intelligent System
                </span>
              </div>
            </div>

            <div className="hidden md:flex space-x-8 font-medium text-sm">
              {["Capabilities", "For Students", "For Staff", "Contact"].map(
                (item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(" ", "-")}`}
                    className="text-slate-600 hover:text-blue-900 transition-colors relative group py-2"
                  >
                    {item}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 transition-all group-hover:w-full"></span>
                  </a>
                ),
              )}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link href={"/login"}>
                <button className="cursor-pointer px-5 py-2.5 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-all shadow-sm font-medium text-sm flex items-center gap-2">
                  Access Portal <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="cursor-pointer text-slate-600 hover:text-slate-900"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* ======================================================== */}
        {/* Mobile Menu Dropdown */}
        {/* ======================================================== */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-lg absolute w-full left-0 top-20 px-4 py-6 flex flex-col gap-4 animate-in slide-in-from-top-5 fade-in duration-200">
            {["Capabilities", "For Students", "For Staff", "Contact"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  onClick={() => setIsMenuOpen(false)} // กดแล้วให้ปิดเมนู
                  className="text-base font-medium text-slate-600 hover:text-blue-900 hover:bg-slate-50 px-4 py-3 rounded-lg transition-colors"
                >
                  {item}
                </a>
              ),
            )}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <Link href={"/docs/introduction"}>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full cursor-pointer px-5 py-3 bg-orange-800 text-white rounded-lg hover:bg-orange-600 transition-all shadow-sm font-medium text-base flex items-center justify-center gap-2"
                >
                  Documentation <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2">
              <Link href={"/login"}>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full cursor-pointer px-5 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-all shadow-sm font-medium text-base flex items-center justify-center gap-2"
                >
                  Access Portal <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* --- Hero Section --- */}
      <section
        ref={heroRef}
        className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50"
      >
        <div className="absolute inset-0 z-0">
          {/* ✅ แก้ไขตรงนี้: เพิ่ม class 'hidden md:block' 
        ความหมาย: ซ่อนบนมือถือ (hidden) แต่แสดงบนจอขนาดกลางขึ้นไป (md:block) 
    */}
          <div
            className={`hidden md:block w-full h-full transition-opacity duration-700 ease-in-out ${
              isHeroInView ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
          >
            <Background3D />
          </div>

          {/* ✅ เพิ่ม: พื้นหลังสำหรับมือถือ (Mobile Fallback) 
        ให้แสดงเฉพาะบนมือถือ (md:hidden) เป็นสีพื้นเรียบๆ หรือ Gradient สวยๆ แทน 3D 
        เพื่อให้ลื่นไหล ไม่กินแบต
    */}
          <div className="md:hidden absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100"></div>

          {/* Gradient Overlay ตัวเดิม */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-slate-50/40 to-slate-50"></div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/20 to-slate-50 z-0"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Reveal: Badge */}
            <ScrollReveal direction="down" delay={0.1}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-sm font-semibold mb-8 shadow-sm">
                <Building2 className="h-4 w-4 text-blue-600" />
                ระบบฐานข้อมูลกลาง มหาวิทยาลัยนเรศวร
              </div>
            </ScrollReveal>

            {/* Reveal: Heading */}
            <ScrollReveal delay={0.2}>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
                <DecryptedText
                  text="ยกระดับองค์กรแห่งการเรียนรู้"
                  speed={100}
                  className="block"
                  characters="ฌโฬฌฑญศญฤกๆฌฏมสอหฤวงวสสสวฏฆฤ"
                  parentClassName="justify-center"
                />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-900 via-blue-700 to-orange-600 h-[1.3em] block">
                  <DecryptedText
                    text="ด้วยปัญญาประดิษฐ์อัจฉริยะ"
                    speed={150}
                    className="block"
                    characters="ฟหกเดำฐฯฯฐฤฏมๆบฒฐฒฐฏฆฒฐโ"
                    parentClassName="justify-center"
                  />
                </span>
              </h1>
            </ScrollReveal>

            {/* Reveal: Description */}
            <div className="mb-10 max-w-2xl mx-auto">
              <TypewriterText
                text="เชื่อมโยงบุคลากรและนิสิตเข้ากับแหล่งข้อมูลองค์กรอย่างมีประสิทธิภาพ แม่นยำ และปลอดภัย ผ่านระบบผู้ช่วยเสมือนจริงมาตรฐานสากล"
                className="text-xl text-slate-600 leading-relaxed font-normal"
                speed={0.03} // ปรับความเร็วตามชอบ
                delay={1.0} // **สำคัญ** ตั้งให้เริ่มพิมพ์หลังจาก Paramount Text (2.8วิ) เล่นใกล้จบ
              />
            </div>

            {/* Reveal: Buttons */}
            <ScrollReveal delay={0.4} direction="up">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={"./main"}>
                  <button className="cursor-pointer group relative px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 font-semibold text-lg overflow-hidden">
                    <MessageSquare className="h-5 w-5 relative z-10" />
                    <ShinyText
                      text="เริ่มต้นใช้งาน (Beta)"
                      speed={4}
                      contrast={1.1}
                      className="relative z-10"
                    />
                  </button>
                </Link>

                <Link href={"./docs/introduction"}>
                  <button className="cursor-pointer px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm font-semibold text-lg flex items-center justify-center gap-3">
                    <BookOpen className="h-5 w-5 text-blue-900" />{" "}
                    ศึกษาคู่มือระบบ
                  </button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* --- Stats Section --- */}
      <section className="bg-white border-y border-slate-100 relative z-20">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* 1. 24/7 พร้อมให้บริการตลอดเวลา */}
            <ScrollReveal delay={0.1}>
              <div className="p-4 group">
                <div className="text-5xl font-bold text-blue-900 mb-2 flex justify-center items-baseline tracking-tight group-hover:scale-105 transition-transform duration-300">
                  24/7
                </div>
                <div className="text-slate-500 font-medium text-base group-hover:text-blue-700 transition-colors">
                  พร้อมให้บริการตลอดเวลา
                </div>
              </div>
            </ScrollReveal>

            {/* 2. 100% ข้อมูลภายในองค์กรที่เชื่อถือได้ */}
            <ScrollReveal delay={0.2}>
              <div className="p-4 group">
                <div className="text-5xl font-bold text-blue-900 mb-2 flex justify-center tracking-tight group-hover:scale-105 transition-transform duration-300">
                  <CountUp
                    from={0}
                    to={100}
                    separator=","
                    direction="up"
                    duration={2}
                    onEnd={undefined}
                  />
                  %
                </div>
                <div className="text-slate-500 font-medium text-base group-hover:text-blue-700 transition-colors">
                  ข้อมูลภายในองค์กรที่เชื่อถือได้
                </div>
              </div>
            </ScrollReveal>

            {/* 3. Secure มีความปลอดภัย */}
            <ScrollReveal delay={0.3}>
              <div className="p-4 group">
                <div className="text-5xl font-bold text-blue-900 mb-2 flex justify-center tracking-tight group-hover:scale-105 transition-transform duration-300">
                  Secure
                </div>
                <div className="text-slate-500 font-medium text-base group-hover:text-blue-700 transition-colors">
                  มีความปลอดภัย
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="capabilities" className="py-24 bg-slate-50 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                ขีดความสามารถหลักของระบบ
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                เทคโนโลยีที่ออกแบบมาเพื่อสนับสนุนการทำงานและลดความซับซ้อนในการเข้าถึงข้อมูล
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Smart Information Retrieval",
                desc: "ค้นหาข้อมูลจากระเบียบและประกาศมหาวิทยาลัยด้วยการถาม-ตอบภาษาธรรมชาติ",
                icon: Search,
                color: "blue",
              },
              {
                title: "Administrative Assistant",
                desc: "ผู้ช่วยเสมือนจริงที่ช่วยสรุปขั้นตอนการดำเนินงานด้านเอกสารและธุรการต่างๆ อย่างเป็นขั้นตอน",
                icon: Bot,
                color: "orange",
              },
              {
                title: "Enterprise Grade Security",
                desc: "ข้อมูลถูกประมวลผลภายในโครงสร้างพื้นฐานของมหาวิทยาลัย รักษาความเป็นส่วนตัวสูงสุด",
                icon: ShieldCheck,
                color: "blue",
              },
            ].map((feature, idx) => (
              // ใช้ delay ตาม index เพื่อให้การ์ดขึ้นมาทีละใบ
              <ScrollReveal key={idx} delay={idx * 0.15} direction="up">
                <SpotlightCard
                  spotlightColor="rgba(251, 146, 60, 0.12)"
                  className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group h-full relative z-10"
                >
                  <div className="mb-6 flex justify-start">
                    <AnimatedIcon color={feature.color}>
                      {/* เปลี่ยนสีไอคอนข้างในให้เข้มขึ้นเพื่อให้ชัดเจน */}
                      <feature.icon
                        className={`h-7 w-7 ${
                          feature.color === "orange"
                            ? "text-orange-600"
                            : "text-blue-700"
                        }`}
                      />
                    </AnimatedIcon>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4 relative z-10 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed relative z-10">
                    {feature.desc}
                  </p>
                </SpotlightCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* --- User Groups Section --- */}
      <section
        id="for-students"
        className="py-24 bg-white relative z-20 border-t border-slate-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* For Students - Slide from Left */}
            <ScrollReveal direction="right" duration={0.8}>
              <div className="relative">
                <div className="border-l-4 border-orange-500 pl-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <BookOpen className="h-6 w-6 text-orange-700" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                      สำหรับนิสิต
                    </h3>
                  </div>
                  <p className="text-slate-600 mb-8 text-lg">
                    สนับสนุนการเรียนรู้และการใช้ชีวิตในมหาวิทยาลัย
                    ด้วยข้อมูลที่รวดเร็วและถูกต้อง
                  </p>
                  {/* ใช้ VerticalScrollList แทน <ul> เดิม */}
                  <VerticalScrollList
                    color="orange"
                    speed={25} // ปรับความเร็ว (ตัวเลขมาก = ช้า)
                    items={[
                      "ตรวจสอบระเบียบการลงทะเบียนและตารางเรียน",
                      "ค้นหาข้อมูลทุนการศึกษาและกิจกรรมพัฒนานิสิต",
                      "ขั้นตอนการยื่นคำร้องออนไลน์ต่างๆ",
                      "ติดตามสถานะเอกสารสำคัญทางการศึกษา",
                      "บริการยืม-คืนทรัพยากรห้องสมุด",
                      "ข้อมูลหอพักและการใช้ชีวิตใน ม.",
                    ]}
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* For Staff - Slide from Right */}
            <ScrollReveal direction="left" duration={0.8} delay={0.2}>
              <div id="for-staff" className="relative">
                <div className="border-l-4 border-blue-900 pl-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Users className="h-6 w-6 text-blue-900" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                      สำหรับบุคลากร
                    </h3>
                  </div>
                  <p className="text-slate-600 mb-8 text-lg">
                    เพิ่มประสิทธิภาพการปฏิบัติงานและการให้บริการ
                    ด้วยคลังความรู้กลางขององค์กร
                  </p>
                  {/* ใช้ VerticalScrollList แทน <ul> เดิม */}
                  <VerticalScrollList
                    color="blue"
                    speed={25} // ลองตั้งให้ช้ากว่าหรือเร็วกว่าอีกฝั่งนิดหน่อยจะดูธรรมชาติขึ้น
                    items={[
                      "สืบค้นระเบียบสวัสดิการและสิทธิประโยชน์",
                      "สนับสนุนข้อมูลประกอบการตัดสินใจและวางแผน",
                      "ลดภาระงานตอบคำถามซ้ำซ้อนด้วยระบบอัตโนมัติ",
                      "ขั้นตอนการเบิกจ่ายและงบประมาณ",
                      "คู่มือการปฏิบัติงาน (Work Instruction)",
                      "ดาวน์โหลดแบบฟอร์มทางราชการ",
                    ]}
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="py-20 bg-slate-50 relative z-20 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-slate-900 mb-10">
              ทำไมต้องเป็น NU Knowledge AI?
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <ScrollReveal delay={0.2} direction="right">
              <div className="flex items-start gap-5 p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-left hover:border-blue-300 transition-all h-full">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-900" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">
                    ลดระยะเวลาการสืบค้น
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    เข้าถึงข้อมูลที่ต้องการได้ในไม่กี่วินาที
                    แทนการค้นหาจากเอกสารจำนวนมาก
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2} direction="left">
              <div className="flex items-start gap-5 p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-left hover:border-orange-300 transition-all h-full">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">
                    ข้อมูลเชื่อถือได้และเป็นปัจจุบัน
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    เชื่อมต่อโดยตรงกับฐานข้อมูลทางการของหน่วยงาน
                    มั่นใจในความถูกต้อง
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer
        id="contact"
        className="bg-slate-900 text-slate-300 pt-16 pb-8 relative z-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Column 1-2: Brand & Intro (เหมือนเดิม) */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Cpu className="h-6 w-6 text-orange-500" />
                <span className="font-bold text-2xl text-white">
                  NU.Knowledge AI
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-sm mb-6">
                แพลตฟอร์มปัญญาประดิษฐ์เพื่อการสนับสนุนการเรียนรู้และการปฏิบัติงาน
                ภายใต้การกำกับดูแลของมหาวิทยาลัยนเรศวร
              </p>
            </div>

            {/* Column 3: Contact Info + MAP (ปรับแก้ตรงนี้) */}
            <div className="col-span-1 md:col-span-2">
              {/* ใช้ col-span-2 เพื่อขยายพื้นที่ให้ Map ดูสวยขึ้น หรือจะแยก column ก็ได้ */}

              <h4 className="font-bold text-white mb-6 uppercase text-sm tracking-widest">
                Location & Contact
              </h4>

              <div className="flex flex-col md:flex-row gap-6">
                {/* ส่วนที่ 1: แผนที่ */}
                <div className="w-full md:w-1/2 h-48">
                  {" "}
                  {/* กำหนดความสูงแผนที่ตรงนี้ */}
                  <QSMap />
                </div>

                {/* ส่วนที่ 2: ข้อความที่อยู่ (ย้ายมาอยู่ข้างๆ หรือใต้แผนที่) */}
                <ul className="space-y-4 text-slate-400 text-sm flex-1">
                  <li className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 flex-shrink-0 text-slate-500" />
                    <span>
                      <strong className="text-white block mb-1">
                        กองบริการการศึกษา มหาวิทยาลัยนเรศวร
                      </strong>
                      99 หมู่ 9 ต.ท่าโพธิ์ อ.เมือง จ.พิษณุโลก 65000
                    </span>
                  </li>
                  <li className="mt-2">
                    <ContactPopover />
                  </li>
                  <li className="mt-4">
                    <a
                      /* Link ไป Google Maps พร้อมพิกัด */
                      href="https://www.google.com/maps/dir/?api=1&destination=16.7466706,100.1927497"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between w-full md:w-fit gap-4 px-4 py-3 bg-slate-800/50 hover:bg-orange-600 border border-slate-700 hover:border-orange-500 rounded-xl transition-all duration-300 cursor-pointer shadow-sm hover:shadow-orange-500/25 backdrop-blur-sm"
                    >
                      {/* ส่วน Icon ด้านซ้าย */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 group-hover:bg-white/20 group-hover:border-transparent transition-colors">
                          <MapPinned className="h-5 w-5 text-orange-500 group-hover:text-white transition-colors" />
                        </div>

                        {/* ส่วนข้อความ */}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-200 group-hover:text-white leading-tight transition-colors">
                            Get Directions
                          </span>
                          <span className="text-[10px] text-slate-500 group-hover:text-orange-100 transition-colors">
                            Navigate via Google Maps
                          </span>
                        </div>
                      </div>

                      {/* ลูกศรชี้ออก (External Link Arrow) */}
                      <ArrowUpRight className="h-4 w-4 text-slate-600 group-hover:text-white transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ... (Footer Bottom) ... */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© 2025 Naresuan University. All rights reserved.</p>
            <p>Developed by Division of Academic Affairs</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FormalLandingPage;
