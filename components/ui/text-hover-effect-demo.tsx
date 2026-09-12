import React from "react";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";

export function TextHoverEffectDemo() {
  return (
    <div className="h-[40rem] flex flex-col items-center justify-center overflow-y-auto w-full px-4">
      <div className="w-full max-w-5xl h-[30rem] flex items-center justify-center">
        <TextHoverEffect text="GENOVA" />
      </div>
    </div>
  );
}

export default TextHoverEffectDemo;
