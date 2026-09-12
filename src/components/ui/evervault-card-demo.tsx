import React from "react";
import { EvervaultCard, Icon } from "./evervault-card";

export function EvervaultCardDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto p-4">
      {/* Card 1: x402 V2 Wire Protocol */}
      <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start max-w-sm mx-auto p-4 relative h-[30rem] bg-black/40 rounded-2xl">
        <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-cyan-400 text-black" />

        <EvervaultCard text="x402" />

        <h2 className="dark:text-white text-black mt-4 text-sm font-semibold tracking-wide">
          x402 V2 Wire Protocol
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Standardized HTTP 402 payment scheme with off-chain EIP-712 permit signing & sub-15ms wire facilitation.
        </p>
        <p className="text-xs border font-mono dark:border-cyan-500/30 border-black/[0.2] rounded-full mt-4 text-cyan-400 px-2 py-0.5">
          Cryptographic Authorization
        </p>
      </div>

      {/* Card 2: GENOVA TokenBudgetEnforcer */}
      <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start max-w-sm mx-auto p-4 relative h-[30rem] bg-black/40 rounded-2xl">
        <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-cyan-400 text-black" />

        <EvervaultCard text="GENOVA" />

        <h2 className="dark:text-white text-black mt-4 text-sm font-semibold tracking-wide">
          On-Chain Budget Enforcer
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          TokenBudgetEnforcer.sol hard ceiling protection. Autonomous AI agents can never exceed authorized spend limits.
        </p>
        <p className="text-xs border font-mono dark:border-emerald-500/30 border-black/[0.2] rounded-full mt-4 text-emerald-400 px-2 py-0.5">
          Hard Spending Ceiling
        </p>
      </div>

      {/* Card 3: SHA-256 Content Delivery Proof */}
      <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start max-w-sm mx-auto p-4 relative h-[30rem] bg-black/40 rounded-2xl">
        <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-cyan-400 text-black" />
        <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-cyan-400 text-black" />

        <EvervaultCard text="SHA256" />

        <h2 className="dark:text-white text-black mt-4 text-sm font-semibold tracking-wide">
          Immutable Delivery Verification
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Cryptographically sealed content payloads with nonce replay defense and prompt injection mitigation.
        </p>
        <p className="text-xs border font-mono dark:border-purple-500/30 border-black/[0.2] rounded-full mt-4 text-purple-400 px-2 py-0.5">
          Zero-Trust Delivery Proof
        </p>
      </div>
    </div>
  );
}
