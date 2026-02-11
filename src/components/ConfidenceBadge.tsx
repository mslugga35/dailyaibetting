"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ConfidenceTier = "lock" | "strong" | "lean" | "none";

interface ConfidenceBadgeProps {
  capperCount: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function getConfidenceTier(capperCount: number): ConfidenceTier {
  if (capperCount >= 4) return "lock";
  if (capperCount === 3) return "strong";
  if (capperCount === 2) return "lean";
  return "none";
}

export function getConfidenceInfo(tier: ConfidenceTier) {
  switch (tier) {
    case "lock":
      return {
        emoji: "💎",
        label: "Lock",
        color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        description: "4+ cappers agree - highest confidence",
      };
    case "strong":
      return {
        emoji: "🔥",
        label: "Strong",
        color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        description: "3 cappers agree - strong consensus",
      };
    case "lean":
      return {
        emoji: "📍",
        label: "Lean",
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        description: "2 cappers agree - slight lean",
      };
    default:
      return {
        emoji: "",
        label: "",
        color: "",
        description: "",
      };
  }
}

export function ConfidenceBadge({ 
  capperCount, 
  className, 
  showLabel = true,
  size = "md" 
}: ConfidenceBadgeProps) {
  const tier = getConfidenceTier(capperCount);
  
  if (tier === "none") return null;
  
  const info = getConfidenceInfo(tier);
  
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        info.color,
        sizeClasses[size],
        "font-medium",
        className
      )}
    >
      <span>{info.emoji}</span>
      {showLabel && <span className="ml-1">{info.label}</span>}
    </Badge>
  );
}

// Standalone version that shows the tier for a specific side
export function SideConfidenceBadge({ 
  side,
  homeCappers, 
  awayCappers,
  homeTeam,
  awayTeam,
  className 
}: { 
  side?: 'home' | 'away';
  homeCappers: number;
  awayCappers: number;
  homeTeam: string;
  awayTeam: string;
  className?: string;
}) {
  // Find the side with consensus (if any)
  const homeTier = getConfidenceTier(homeCappers);
  const awayTier = getConfidenceTier(awayCappers);
  
  // Determine which side has the stronger consensus
  const showHome = side === 'home' || (!side && homeTier !== "none" && homeCappers >= awayCappers);
  const showAway = side === 'away' || (!side && awayTier !== "none" && awayCappers > homeCappers);
  
  if (!showHome && !showAway) return null;
  
  const tier = showHome ? homeTier : awayTier;
  const capperCount = showHome ? homeCappers : awayCappers;
  const team = showHome ? homeTeam : awayTeam;
  
  if (tier === "none") return null;
  
  const info = getConfidenceInfo(tier);
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Badge 
        variant="outline" 
        className={cn(info.color, "text-xs px-2 py-0.5 font-medium")}
      >
        <span>{info.emoji}</span>
        <span className="ml-1">{info.label}</span>
      </Badge>
      <span className="text-xs text-muted-foreground">
        {team.split(' ').pop()}
      </span>
    </div>
  );
}
