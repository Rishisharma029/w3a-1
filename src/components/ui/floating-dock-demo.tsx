"use client";
import React from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconBuildingStore,
  IconRobot,
  IconBolt,
  IconReceipt2,
  IconShieldLock,
  IconCheckupList,
  IconBox,
  IconBrandGithub,
} from "@tabler/icons-react";

export function FloatingDockDemo() {
  const w3aLinks = [
    {
      title: "Owner Center",
      icon: (
        <IconHome className="h-full w-full text-primary" />
      ),
      href: "#overview",
    },
    {
      title: "Marketplace",
      icon: (
        <IconBuildingStore className="h-full w-full text-tertiary" />
      ),
      href: "#providers",
    },
    {
      title: "AI Purchase",
      icon: (
        <IconRobot className="h-full w-full text-secondary" />
      ),
      href: "#agent",
    },
    {
      title: "Live Stream",
      icon: (
        <IconBolt className="h-full w-full text-amber-400" />
      ),
      href: "#current",
    },
    {
      title: "Transactions",
      icon: (
        <IconReceipt2 className="h-full w-full text-neutral-300" />
      ),
      href: "#transactions",
    },
    {
      title: "Security Defense",
      icon: (
        <IconShieldLock className="h-full w-full text-error" />
      ),
      href: "#security",
    },
    {
      title: "Delivery Proof",
      icon: (
        <IconCheckupList className="h-full w-full text-tertiary" />
      ),
      href: "#delivery",
    },
    {
      title: "3D Scene",
      icon: (
        <IconBox className="h-full w-full text-secondary" />
      ),
      href: "#scene",
    },
    {
      title: "GitHub Repo",
      icon: (
        <IconBrandGithub className="h-full w-full text-white" />
      ),
      href: "https://github.com/Rishisharma029/w3a-1",
    },
  ];

  return (
    <div className="flex items-center justify-center h-[35rem] w-full">
      <FloatingDock
        mobileClassName="translate-y-20"
        items={w3aLinks}
      />
    </div>
  );
}

export default FloatingDockDemo;
