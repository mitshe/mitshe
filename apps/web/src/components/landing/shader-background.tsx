"use client";

import { useEffect, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";
import { useTheme } from "next-themes";

interface ShaderBackgroundProps {
  variant?: "hero" | "cta";
  className?: string;
}

export function ShaderBackground({
  variant = "hero",
  className = "",
}: ShaderBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    setMounted(true);

    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: Math.min(window.innerHeight, 1200),
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  const colorSchemes = {
    hero: isDark
      ? { back: "#140a0a", front: "#c18fed" }
      : { back: "#a391ff", front: "#c9aef6" },
    cta: isDark
      ? { back: "#0a0c14", front: "#6366f1" }
      : { back: "#f8faff", front: "#4f46e5" },
  };

  const shapeConfig = {
    hero: { shape: "warp" as const, size: 3, speed: 0.3, scale: 1.2 },
    cta: { shape: "sphere" as const, size: 2.5, speed: 0.2, scale: 1 },
  };

  const colors = colorSchemes[variant];
  const config = shapeConfig[variant];

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Dithering
        width={dimensions.width}
        height={dimensions.height}
        colorBack={colors.back}
        colorFront={colors.front}
        shape={config.shape}
        type="4x4"
        size={config.size}
        speed={config.speed}
        scale={config.scale}
      />
    </div>
  );
}
