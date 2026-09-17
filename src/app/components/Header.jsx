"use client";

import React from "react";
import Image from "next/image";
import logoImg from "../assets/pinwheel_transparent.png";

export default function Header({ email = "test@vitto.in", onLogout }) {
  return (
    <header className="w-full bg-white border-b border-slate-200 py-3 px-6 md:px-10 flex items-center justify-between shadow-xs">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-xs overflow-hidden p-1.5">
          <Image src={logoImg} alt="logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-md md:text-lg font-bold text-[var(--primary-color)]">
          Vitto
        </h1>
      </div>

      {/* Right User Controls */}
      <div>
        <button
          onClick={onLogout}
          className="text-xs font-medium text-slate-700 bg-white border border-slate-300 px-3.5 py-1.5 rounded-lg transition-all shadow-2xs hover:border-slate-400 hover:bg-[var(--primary-color)] hover:text-white hover:border-white  active:scale-95 cursor-pointer"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
