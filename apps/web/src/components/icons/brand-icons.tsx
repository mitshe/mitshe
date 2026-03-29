/**
 * Brand Icons - Using react-icons
 * https://react-icons.github.io/react-icons/
 */

import {
  SiSlack,
  SiDiscord,
  SiTelegram,
  SiGithub,
  SiGitlab,
  SiJira,
  SiLinear,
  SiObsidian,
  SiAnthropic,
  SiOpenai,
  SiGoogle,
  SiJetbrains,
} from "react-icons/si";
import { BsMicrosoftTeams } from "react-icons/bs";
import { TbWebhook } from "react-icons/tb";
import { AiFillApi } from "react-icons/ai";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

// ============================================================================
// Communication Platforms
// ============================================================================

export function SlackIcon({ className }: IconProps) {
  return <SiSlack className={cn("w-5 h-5", className)} />;
}

export function DiscordIcon({ className }: IconProps) {
  return <SiDiscord className={cn("w-5 h-5", className)} />;
}

export function TelegramIcon({ className }: IconProps) {
  return <SiTelegram className={cn("w-5 h-5", className)} />;
}

export function TeamsIcon({ className }: IconProps) {
  return <BsMicrosoftTeams className={cn("w-5 h-5", className)} />;
}

// ============================================================================
// Development Platforms
// ============================================================================

export function GitHubIcon({ className }: IconProps) {
  return <SiGithub className={cn("w-5 h-5", className)} />;
}

export function GitLabIcon({ className }: IconProps) {
  return <SiGitlab className={cn("w-5 h-5", className)} />;
}

// ============================================================================
// Project Management
// ============================================================================

export function JiraIcon({ className }: IconProps) {
  return <SiJira className={cn("w-5 h-5", className)} />;
}

export function YouTrackIcon({ className }: IconProps) {
  // YouTrack is JetBrains product
  return <SiJetbrains className={cn("w-5 h-5", className)} />;
}

export function LinearIcon({ className }: IconProps) {
  return <SiLinear className={cn("w-5 h-5", className)} />;
}

// ============================================================================
// Knowledge Base
// ============================================================================

export function ObsidianIcon({ className }: IconProps) {
  return <SiObsidian className={cn("w-5 h-5", className)} />;
}

// ============================================================================
// AI Providers
// ============================================================================

export function AnthropicIcon({ className }: IconProps) {
  return <SiAnthropic className={cn("w-5 h-5", className)} />;
}

export function OpenAIIcon({ className }: IconProps) {
  return <SiOpenai className={cn("w-5 h-5", className)} />;
}

export function OpenRouterIcon({ className }: IconProps) {
  // OpenRouter aggregates AI providers - use API icon
  return <AiFillApi className={cn("w-5 h-5", className)} />;
}

export function GoogleIcon({ className }: IconProps) {
  return <SiGoogle className={cn("w-5 h-5", className)} />;
}

export function GroqIcon({ className }: IconProps) {
  // Groq - fast AI inference, use lightning-style icon
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-5 h-5", className)}
    >
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.6c4.636 0 8.4 3.764 8.4 8.4s-3.764 8.4-8.4 8.4S3.6 16.636 3.6 12 7.364 3.6 12 3.6zm0 2.4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z" />
    </svg>
  );
}

// ============================================================================
// Generic Icons
// ============================================================================

export function WebhookIcon({ className }: IconProps) {
  return <TbWebhook className={cn("w-5 h-5", className)} />;
}

export function APIIcon({ className }: IconProps) {
  return <AiFillApi className={cn("w-5 h-5", className)} />;
}
