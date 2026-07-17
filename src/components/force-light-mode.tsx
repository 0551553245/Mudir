"use client";

import { useEffect } from "react";

/** Dark mode is disabled — clear any leftover preference. */
export function ForceLightMode() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("scop-theme");
  }, []);

  return null;
}
