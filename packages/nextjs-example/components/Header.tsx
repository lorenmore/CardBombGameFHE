"use client";

import React, { useRef } from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/helper";
import { useOutsideClick } from "~~/hooks/helper";

/**
 * Site header
 */
export const Header = () => {
  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className="sticky top-0 navbar min-h-0 shrink-0 justify-between z-20 px-4 py-2 bg-base-100/90 backdrop-blur-md border-b border-base-300 shadow-sm">
      <div className="navbar-start">
        <div className="flex items-center gap-2">
          <span className="text-xl">💣</span>
          <span className="font-bold tracking-widest text-base-content text-sm hidden sm:block">
            CARD BOMB <span className="text-primary">FHE</span>
          </span>
        </div>
      </div>
      <div className="navbar-end grow flex items-center gap-3">
        {mounted && (
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <SunIcon className="w-5 h-5 text-yellow-400" />
            ) : (
              <MoonIcon className="w-5 h-5 text-slate-600" />
            )}
          </button>
        )}
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
