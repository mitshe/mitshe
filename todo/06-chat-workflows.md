# 06 — Chat can't properly create/manage workflows

## Problem
Chat AI tries to create workflows but:
- Doesn't know available node types
- Confuses block configurations
- Creates invalid workflow definitions
- No tool to validate workflow before saving

## Fixes
- [ ] Add node type catalog to chat system prompt
      List all available types with brief description and required config fields
- [ ] Add workflow_validate MCP tool
      Validates definition before creating — returns errors if invalid
- [ ] Add workflow_list_templates MCP tool
      AI can suggest templates instead of building from scratch
- [ ] Better error messages from workflow creation
      Instead of generic "validation failed" — say which node/edge is wrong
- [ ] Consider: chat creates workflow from natural language description
      "When a new Jira task is assigned to me, create a session and start Claude Code"
      → AI translates to workflow definition using templates as base
