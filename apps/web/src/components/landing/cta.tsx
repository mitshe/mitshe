"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ShaderBackground } from "./shader-background";

export function CTA() {
  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      {/* Shader Background */}
      <div className="absolute inset-0 opacity-15 sm:opacity-20">
        <ShaderBackground variant="cta" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-primary/10 rounded-3xl blur-2xl" />

          {/* Card */}
          <div className="relative bg-card border border-border rounded-2xl p-8 sm:p-12 text-center">
            {/* Heading */}
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 tracking-tight">
              Ready to automate?
            </h2>

            {/* Description */}
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start building powerful automations today. No credit card
              required.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="h-12 px-8 text-base font-medium shadow-lg shadow-primary/25"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-base font-medium"
                >
                  Read Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
