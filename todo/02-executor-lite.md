> DONE

# 02 — Executor Lite: lightweight image without browser/GUI

## Why
Current executor image is heavy (Xvfb, x11vnc, noVNC, Chrome, Playwright deps).
Most sessions don't need browser. Two image variants:
- `mitshe-executor:latest` — full (with Chrome/noVNC/Playwright)
- `mitshe-executor:lite` — terminal only (no X11, no Chrome)

## What
- Create separate Dockerfile or multi-stage build
- Lite: Node.js, Git, Claude Code, OpenClaw, Python, Docker CLI, common tools
- Full: Lite + Xvfb + x11vnc + noVNC + Chrome + Playwright
- Session create: option to pick "with browser" or "terminal only"
- Default: lite (faster startup, less RAM)

## Impact
- Lite image: ~1-2GB smaller
- Faster container startup
- Less RAM per session (no Chrome overhead)
