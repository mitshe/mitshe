import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cn, formatDistanceToNow } from "./utils";

describe("cn (class name utility)", () => {
  it("should merge class names", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  it("should merge tailwind classes correctly", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("should handle false conditional classes", () => {
    const isActive = false;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class");
  });

  it("should handle arrays", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  it("should handle objects", () => {
    const result = cn({ class1: true, class2: false, class3: true });
    expect(result).toBe("class1 class3");
  });

  it("should handle undefined and null", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toBe("base end");
  });
});

describe("formatDistanceToNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for times less than a minute ago', () => {
    const date = new Date("2024-01-20T11:59:30Z"); // 30 seconds ago
    expect(formatDistanceToNow(date)).toBe("just now");
  });

  it("should return minutes ago for times less than an hour", () => {
    const date = new Date("2024-01-20T11:45:00Z"); // 15 minutes ago
    expect(formatDistanceToNow(date)).toBe("15m ago");
  });

  it("should return hours ago for times less than a day", () => {
    const date = new Date("2024-01-20T09:00:00Z"); // 3 hours ago
    expect(formatDistanceToNow(date)).toBe("3h ago");
  });

  it("should return days ago for times less than a month", () => {
    const date = new Date("2024-01-15T12:00:00Z"); // 5 days ago
    expect(formatDistanceToNow(date)).toBe("5d ago");
  });

  it("should return months ago for times less than a year", () => {
    const date = new Date("2023-11-20T12:00:00Z"); // 2 months ago
    expect(formatDistanceToNow(date)).toBe("2mo ago");
  });

  it("should return years ago for times more than a year", () => {
    const date = new Date("2022-01-20T12:00:00Z"); // 2 years ago
    expect(formatDistanceToNow(date)).toBe("2y ago");
  });

  it("should handle edge case: exactly 1 minute ago", () => {
    const date = new Date("2024-01-20T11:59:00Z"); // 1 minute ago
    expect(formatDistanceToNow(date)).toBe("1m ago");
  });

  it("should handle edge case: exactly 1 hour ago", () => {
    const date = new Date("2024-01-20T11:00:00Z"); // 1 hour ago
    expect(formatDistanceToNow(date)).toBe("1h ago");
  });

  it("should handle edge case: exactly 1 day ago", () => {
    const date = new Date("2024-01-19T12:00:00Z"); // 1 day ago
    expect(formatDistanceToNow(date)).toBe("1d ago");
  });
});
