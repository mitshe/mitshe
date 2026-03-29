/**
 * Landing page brand icons - Using react-icons with brand colors
 */

import {
  SiSlack,
  SiGithub,
  SiGitlab,
  SiJira,
  SiLinear,
  SiObsidian,
  SiAnthropic,
  SiOpenai,
  SiJetbrains,
} from "react-icons/si";
import { BsMicrosoftTeams } from "react-icons/bs";
import { TbWebhook } from "react-icons/tb";
import { AiFillApi } from "react-icons/ai";

export function JiraIcon({ className }: { className?: string }) {
  return <SiJira className={className} color="#0052CC" />;
}

export function GitLabIcon({ className }: { className?: string }) {
  return <SiGitlab className={className} color="#FC6D26" />;
}

export function GitHubIcon({ className }: { className?: string }) {
  return <SiGithub className={className} color="#181717" />;
}

export function SlackIcon({ className }: { className?: string }) {
  return <SiSlack className={className} color="#4A154B" />;
}

export function YouTrackIcon({ className }: { className?: string }) {
  return <SiJetbrains className={className} color="#000000" />;
}

export function ObsidianIcon({ className }: { className?: string }) {
  return <SiObsidian className={className} color="#483699" />;
}

export function ClaudeIcon({ className }: { className?: string }) {
  return <SiAnthropic className={className} color="#D4A27F" />;
}

export function OpenAIIcon({ className }: { className?: string }) {
  return <SiOpenai className={className} color="#000000" />;
}

export function TeamsIcon({ className }: { className?: string }) {
  return <BsMicrosoftTeams className={className} color="#6264A7" />;
}

export function LinearIcon({ className }: { className?: string }) {
  return <SiLinear className={className} color="#5E6AD2" />;
}

export function WebhookIcon({ className }: { className?: string }) {
  return <TbWebhook className={className} color="#6366F1" />;
}

export function APIIcon({ className }: { className?: string }) {
  return <AiFillApi className={className} color="#EF4444" />;
}
