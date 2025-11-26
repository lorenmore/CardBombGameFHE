"use client";

import React, { useRef } from "react";
import { RainbowKitCustomConnectButton } from "~~/components/helper";
import { useOutsideClick } from "~~/hooks/helper";

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky top-0 navbar min-h-0 shrink-0 justify-between z-20 px-4 py-2 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
      <div className="navbar-start">
        <div className="flex items-center gap-2">
          <span className="text-xl">💣</span>
          <span className="font-bold tracking-widest text-white text-sm hidden sm:block">
            ZAMA <span className="text-cyan-500">PROTOCOL</span>
          </span>
        </div>
      </div>
      <div className="navbar-end grow">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
