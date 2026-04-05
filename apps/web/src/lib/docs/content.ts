/**
 * Documentation content for all pages.
 * The key is the slug (e.g., "" for intro, "workflows" for workflows page).
 */
export const docsContent: Record<string, string> = {
  "": `# Welcome to mitshe

Build powerful automations with AI. Connect your development tools, create visual workflows, and automate repetitive tasks.

:::info
**New here?** Create your first workflow in 5 minutes with the [Quick Start Guide](/docs/quickstart).
:::

## What can you build?

<cards>
<card title="Automated Code Reviews" icon="sparkles" href="/docs/workflows/ai-nodes">
Let AI review every pull request, catch bugs, and suggest improvements before human review.
</card>
<card title="Issue to Code" icon="workflow" href="/docs/workflows">
Automatically turn Jira issues into Git branches, code implementations, and merge requests.
</card>
<card title="Smart Notifications" icon="message" href="/docs/integrations/slack">
Send intelligent Slack updates when important events happen in your projects.
</card>
<card title="Auto Documentation" icon="book" href="/docs/workflows/ai-nodes">
Generate and update documentation automatically when code changes.
</card>
</cards>

## How it works

Connect nodes in a visual editor to build automations:

<diagram>
trigger -> action -> action -> result
Jira Issue Created -> AI Analyzes Issue -> Creates Git Branch -> Sends Slack Message
</diagram>

Every workflow has three parts:
- **Trigger** — What starts it (webhook, schedule, Jira event)
- **Actions** — What it does (AI prompts, Git operations, notifications)
- **Connections** — How data flows between nodes using \`{{expressions}}\`

## Next steps

:::steps
### Connect your tools
Go to [Settings → Integrations](/settings/integrations) and connect GitHub, Jira, or Slack.

### Create your first workflow
Follow the [Quick Start Guide](/docs/quickstart) to build a simple automation.

### Explore AI capabilities
Learn how to use [AI Nodes](/docs/workflows/ai-nodes) to add intelligence to your workflows.
:::
`,

  quickstart: `# Quick Start Guide

Build your first workflow in 5 minutes.

:::info
**Prerequisites:** Connect Slack first at [Settings → Integrations](/settings/integrations).
:::

## Step 1: Create a workflow

1. Go to **Workflows** in the sidebar
2. Click **Create Workflow**
3. Name it "My First Workflow"

## Step 2: Add a trigger

Every workflow starts with a trigger — the event that kicks it off.

1. Click **+ Add Trigger**
2. Select **Manual Trigger**

:::tip
Use Manual triggers while learning. Switch to webhooks or schedules for production.
:::

## Step 3: Add an action

1. Click **+ Add Node** below the trigger
2. Select **Slack → Send Message**
3. Configure it:

<example>
| Field | Value |
|-------|-------|
| **Channel** | \`#general\` |
| **Message** | \`Hello from mitshe! Triggered at {{trigger.timestamp}}\` |
</example>

## Step 4: Save and run

1. Click **Save**
2. Click **Run** to test
3. Check Slack for your message

## Next steps

- [Nodes & Connections](/docs/workflows/nodes) — Build complex workflows
- [AI Nodes](/docs/workflows/ai-nodes) — Add intelligence
- [GitHub Integration](/docs/integrations/github) — Automate Git
`,

  workflows: `# What are Workflows?

A workflow is a series of automated steps. When something happens (trigger), do these things (actions), in order.

## Example: Automated code reviews

Without mitshe:
1. See a pull request notification
2. Open the PR, read changes
3. Write review comments
4. Post them on GitHub

With mitshe:

<diagram>
trigger -> action -> action -> result
New PR Created -> AI Reviews Code -> Posts Comments -> Done!
</diagram>

## Workflow structure

Every workflow has three parts:

### 1. Trigger (What starts it)

| Trigger | When it runs |
|---------|--------------|
| **Manual** | Click "Run" in the UI |
| **Webhook** | HTTP request to your endpoint |
| **Schedule** | Cron schedule (e.g., daily at 9am) |
| **Jira Issue** | Issue created or updated |
| **Git Push** | Code pushed to a branch |
| **Pull Request** | PR opened or updated |

### 2. Actions (What it does)

| Category | Examples |
|----------|----------|
| **AI** | Generate text, analyze code, extract data |
| **Git** | Create branches, commit files, open PRs |
| **Jira** | Update issues, add comments, change status |
| **Slack** | Send messages to channels |
| **HTTP** | Call any API |

### 3. Connections (How data flows)

Data flows between nodes using **expressions**:

<example>
**Node 1: AI Prompt**
\`Summarize this code: {{trigger.diff}}\`

**Node 2: Slack Message**
\`Code summary: {{nodes.ai_prompt.content}}\`
</example>

The \`{{...}}\` syntax references data from triggers and previous nodes.

## Creating a workflow

:::steps
### Go to Workflows
Click **Workflows** in the sidebar, then **Create Workflow**.

### Add a trigger
Choose what starts your workflow. Use **Manual Trigger** for testing.

### Add actions
Click **+ Add Node** and choose your actions. Connect nodes by dragging handles.

### Activate
Click **Save**, then toggle **Active** to enable.
:::

## Next steps

- [Nodes & Connections](/docs/workflows/nodes) — Deep dive into node types
- [AI Nodes](/docs/workflows/ai-nodes) — Add intelligence
- [Expressions](/docs/workflows/expressions) — Master data flow
`,

  "workflows/nodes": `# Nodes & Connections

Nodes are individual steps in a workflow. Connect them to form a pipeline where data flows from one step to the next.

## Node types

### Triggers

Every workflow starts with one trigger:

<nodelist>
<node type="trigger" name="Manual" desc="Run on-demand from the UI or API" />
<node type="trigger" name="Webhook" desc="Triggered by HTTP POST requests" />
<node type="trigger" name="Schedule" desc="Run on a cron schedule" />
<node type="trigger" name="Jira Issue" desc="When issues are created or updated" />
<node type="trigger" name="Git Push" desc="When code is pushed to branches" />
<node type="trigger" name="Pull Request" desc="When PRs are opened or updated" />
</nodelist>

### Actions

Actions do the actual work:

<nodelist>
<node type="ai" name="AI Prompt" desc="Send a prompt, get a response" />
<node type="ai" name="AI Analyze" desc="Extract structured data from text" />
<node type="ai" name="AI Code Review" desc="Specialized code review with issues list" />
<node type="git" name="Create Branch" desc="Create a new Git branch" />
<node type="git" name="Commit Files" desc="Commit changes to a branch" />
<node type="git" name="Create PR" desc="Open a pull request" />
<node type="jira" name="Update Issue" desc="Modify Jira issue fields" />
<node type="jira" name="Add Comment" desc="Post a comment on an issue" />
<node type="slack" name="Send Message" desc="Post to a Slack channel" />
<node type="http" name="HTTP Request" desc="Call any REST API" />
</nodelist>

### Control flow

Control execution order:

<nodelist>
<node type="control" name="Condition" desc="Branch based on if/else logic" />
<node type="control" name="Loop" desc="Iterate over arrays" />
<node type="control" name="Parallel" desc="Run multiple branches simultaneously" />
</nodelist>

## Connecting nodes

Drag from an output handle to an input handle. Data flows through connections automatically.

<diagram>
trigger -> action -> action -> result
Trigger → AI Prompt → Condition → Slack or Email
</diagram>

When Node A connects to Node B:
- Node A runs first
- Its output is available to Node B via \`{{nodes.nodeA.field}}\`

## Configuration

Click a node to open its configuration panel:

<example>
**AI Prompt Node**

| Field | Value |
|-------|-------|
| **Prompt** | \`Summarize: {{trigger.content}}\` |
| **System Prompt** | \`You are a helpful assistant\` |
| **Model** | \`claude-sonnet-4\` |
| **Max Tokens** | \`1000\` |
</example>

## Accessing node outputs

Every node produces output that subsequent nodes can use:

| Node Type | Output Fields |
|-----------|---------------|
| **AI Prompt** | \`content\` (the response text) |
| **AI Analyze** | \`result\` (structured data object) |
| **AI Code Review** | \`summary\`, \`issues[]\`, \`score\` |
| **Create Branch** | \`branchName\`, \`url\` |
| **Create PR** | \`prNumber\`, \`url\`, \`title\` |
| **HTTP Request** | \`status\`, \`body\`, \`headers\` |

Access these with: \`{{nodes.nodeId.fieldName}}\`

:::tip
Hover over any node in the editor to see its available output fields.
:::
`,

  "workflows/ai-nodes": `# AI Nodes

Add AI to your workflows. Generate content, analyze code, extract structured data.

## AI providers

Configure in [Settings → AI Providers](/settings/ai):

| Provider | Best for | Models |
|----------|----------|--------|
| **Claude** | Complex reasoning, code | Sonnet 4.5, Opus 4, Haiku |
| **OpenAI** | General tasks | GPT-4.1, o3, o4-mini |
| **Gemini** | Multimodal | 2.5 Pro, 2.5 Flash |
| **Groq** | Speed | LLaMA 4, Mixtral |

## AI Prompt

Send a prompt, get a response. The most common AI node.

<example>
| Field | Value |
|-------|-------|
| **Prompt** | \`Review this code for bugs: {{trigger.diff}}\` |
| **System Prompt** | \`You are a senior engineer. Be concise.\` |
| **Model** | \`claude-sonnet-4-5\` |

**Output:** \`{ "content": "I found 2 potential issues..." }\`
</example>

**Output:**

<outputref>
{{nodes.ai_prompt_1.content}} → Full text response from AI
</outputref>

## AI Analyze

Extract **structured data** from text. Define a schema and get organized data instead of free-form text.

<example>
| Field | Value |
|-------|-------|
| **Content** | \`{{trigger.issueDescription}}\` |
| **Instruction** | \`Extract task type, priority, and components\` |
| **Schema** | \`{ type: string, priority: "high"/"medium"/"low", components: string[] }\` |

**Output:** \`{ "result": { "type": "bug", "priority": "high", "components": ["auth", "api"] } }\`
</example>

**Output:**

<outputref>
{{nodes.ai_analyze_1.result.type}} → "bug"
{{nodes.ai_analyze_1.result.priority}} → "high"
{{nodes.ai_analyze_1.result.components}} → ["auth", "api"]
</outputref>

## AI Code Review

Specialized for code reviews. Returns structured feedback with issues list.

<example>
| Field | Value |
|-------|-------|
| **Diff** | \`{{trigger.pullRequest.diff}}\` |
| **Focus Areas** | \`security, performance, readability\` |

**Output:**
\`\`\`json
{
  "summary": "Good code with 2 minor issues",
  "score": 8,
  "issues": [
    { "severity": "warning", "line": 42, "message": "Use const instead of let" },
    { "severity": "info", "line": 67, "message": "Function could be simplified" }
  ]
}
\`\`\`
</example>

**Output:**

<outputref>
{{nodes.ai_review_1.summary}} → "Good code with 2 minor issues"
{{nodes.ai_review_1.score}} → 8
{{nodes.ai_review_1.issues.length}} → 2
</outputref>

## Best practices

:::tip
**Be specific.** Instead of "review this code", say "check for SQL injection and XSS vulnerabilities in this Python code".
:::

:::warning
**Validate outputs.** AI responses can vary. Always validate before destructive actions like deleting files.
:::

:::info
**Use system prompts** to set the AI's persona and constraints. Improves consistency across runs.
:::
`,

  "workflows/expressions": `# Variables & Expressions

Pass data between nodes using expressions with \`{{...}}\` syntax.

## Data sources

### Trigger data

The trigger provides initial data:

<outputref>
{{trigger.issueKey}}        → "PROJ-123"
{{trigger.branch}}          → "feature/new-login"
{{trigger.user.name}}       → "John Doe"
{{trigger.pullRequest.url}} → "https://github.com/..."
</outputref>

Available data depends on trigger type:

| Trigger | Available Data |
|---------|----------------|
| **Webhook** | \`body\`, \`headers\`, \`query\` |
| **Jira Issue** | \`issueKey\`, \`summary\`, \`description\`, \`status\` |
| **Git Push** | \`branch\`, \`commits[]\`, \`repository\` |
| **Pull Request** | \`prNumber\`, \`title\`, \`diff\`, \`author\` |

### Context variables (ctx.*)

Workflow context is shared state that flows through all nodes. Use \`ctx.*\` for commonly accessed values:

<outputref>
{{ctx.branch}}           → Current Git branch name
{{ctx.mrUrl}}            → Merge request / Pull request URL
{{ctx.prUrl}}            → Alias for mrUrl
{{ctx.repositoryFullPath}} → "owner/repo"
{{ctx.defaultBranch}}    → "main" or "develop"
{{ctx.issueKey}}         → Current issue key (from script output)
{{ctx.issueUrl}}         → Current issue URL
{{ctx.files}}            → Files generated by AI (array)
</outputref>

Context is automatically populated by:
- **Script nodes** — All output fields are added to ctx
- **Git Clone** — Sets \`repositoryFullPath\`, \`defaultBranch\`, \`branch\`
- **Git Branch** — Sets \`branch\`
- **Git Create MR/PR** — Sets \`mrUrl\`, \`prUrl\`, \`mrId\`, \`prId\`
- **AI Code Task** — Sets \`files\` array

:::tip
Use \`ctx.*\` for workflow-level values. Use \`nodes.*\` for specific node outputs.
:::

### Node outputs

Each node produces output for later nodes:

<outputref>
{{nodes.ai_prompt_1.content}} → AI response text
{{nodes.create_branch.name}} → "feature/PROJ-123"
{{nodes.http_request.body.data}} → Response JSON
</outputref>

Format: \`{{nodes.<nodeId>.<field>}}\`

:::tip
Click a node in the editor to see its ID and available outputs.
:::

## Common patterns

### Dynamic prompts

Combine trigger data with text:

<example>
**AI Prompt:**
\`\`\`
Analyze this issue and suggest implementation:

**Issue:** {{trigger.issueKey}} - {{trigger.summary}}
**Description:** {{trigger.description}}

Provide: 1. Technical approach  2. Complexity (low/medium/high)  3. Risks
\`\`\`
</example>

### Chaining nodes

Use output from one node in the next:

<example>
**Node 1: AI Analyze**
\`Input: {{trigger.description}}\`
\`Output: { complexity: "high", components: ["auth", "api"] }\`

**Node 2: Slack Message**
\`Issue {{trigger.issueKey}}: {{nodes.ai_analyze.result.complexity}} complexity\`
</example>

### Conditions

Branch based on values:

<example>
**Condition node:**
\`If {{nodes.ai_review.score}} >= 8 → Auto-approve\`
\`Else → Request human review\`
</example>

## Shortcuts

| Shortcut | Full expression |
|----------|-----------------|
| \`{{branch}}\` | \`{{ctx.branch}}\` |
| \`{{repo}}\` | \`{{ctx.repository.path}}\` |
| \`{{issue}}\` | \`{{trigger.issueKey}}\` |

## Debugging

Expression not working?

1. **Check node ID** — Must match exactly
2. **Check field name** — Case-sensitive
3. **Check order** — Can only reference nodes that ran before
4. **Use debugger** — Click "Debug" on an execution to see all values
`,

  integrations: `# Integrations

Connect your tools to mitshe. Automate across Git providers, issue trackers, and communication platforms.

## Git Providers

<cards>
<card title="GitHub" icon="git" href="/docs/integrations/github">
Branches, commits, PRs. Trigger on push, PR, release events.
</card>
<card title="GitLab" icon="git" href="/docs/integrations/gitlab">
Branches, MRs, pipelines. Self-hosted supported.
</card>
</cards>

## Issue Trackers

<cards>
<card title="Jira" icon="box" href="/docs/integrations/jira">
Sync issues, automate transitions, JQL queries.
</card>
<card title="YouTrack" icon="box" href="/docs/integrations/youtrack">
JetBrains issue tracker. Cloud & Server supported.
</card>
</cards>

## Communication

<cards>
<card title="Slack" icon="message" href="/docs/integrations/slack">
Send messages, alerts, rich Block Kit notifications.
</card>
</cards>

## Knowledge Base

<cards>
<card title="Obsidian" icon="book" href="/docs/integrations/obsidian">
Search notes, create entries, build automated knowledge bases.
</card>
</cards>

## Setup Pattern

All integrations follow the same steps:

:::steps
### Create Token
Generate an API token in the external service with required permissions.

### Connect in mitshe
[Settings → Integrations](/settings/integrations) → Click **Connect**

### Enter Credentials
Paste your token and any required URLs (for self-hosted services).

### Test & Save
Click **Test Connection** to verify, then **Save**.
:::

## Security

:::info
**Encrypted credentials.** AES-256-GCM encryption for all tokens. Decrypted only at runtime, never logged or stored in plaintext.
:::

| Feature | Description |
|---------|-------------|
| **Encryption** | AES-256-GCM at rest |
| **Permissions** | Minimal required scopes |
| **Revocation** | Disconnect anytime |
| **Rotation** | Re-authenticate to rotate tokens |
| **Audit logs** | Available on Enterprise |

## Coming Soon

- **Linear** — Modern issue tracking
- **Notion** — Docs and databases
- **Discord** — Team communication
- **Microsoft Teams** — Enterprise chat
`,

  "integrations/github": `# GitHub

Automate Git operations — branches, commits, pull requests.

## Setup

:::steps
### Create a Fine-grained Token

1. Go to [GitHub → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Set expiration (90 days recommended)
4. Select repositories to grant access
5. Add permissions listed below

### Connect to mitshe

1. Go to [Settings → Integrations](/settings/integrations)
2. Click **Connect** on GitHub
3. Paste your token
4. Click **Test Connection** → **Save**

### Enable Repositories

1. Go to [Settings → Repositories](/settings/repositories)
2. Click **Sync from GitHub**
3. Toggle on repos you want to use
:::

### Required Permissions

| Permission | Access | Purpose |
|------------|--------|---------|
| **Contents** | Read and write | Read files, create commits |
| **Pull requests** | Read and write | Create and manage PRs |
| **Metadata** | Read-only | Access repo info |

:::warning
**Token security:** GitHub only shows tokens once. Store securely. Rotate every 90 days.
:::

## Available Nodes

### Triggers

<nodelist>
<node type="trigger" name="Push" desc="When code is pushed to a branch" />
<node type="trigger" name="Pull Request" desc="When PR is opened, updated, or merged" />
<node type="trigger" name="Release" desc="When a release is published" />
</nodelist>

### Actions

<nodelist>
<node type="git" name="Create Branch" desc="Create a new branch from base" />
<node type="git" name="Commit Files" desc="Commit file changes to a branch" />
<node type="git" name="Create PR" desc="Open a pull request" />
<node type="git" name="Merge PR" desc="Merge a pull request" />
<node type="git" name="Get Diff" desc="Fetch diff between branches or commits" />
<node type="git" name="Get File" desc="Read file contents from a branch" />
</nodelist>

## Examples

### Auto-create branch from Jira

<example>
**Trigger:** Jira Issue Created

**Create Branch:**
| Field | Value |
|-------|-------|
| **Repository** | \`{{project.repository}}\` |
| **Branch Name** | \`feature/{{trigger.issueKey}}-{{trigger.summary | slugify}}\` |
| **Base** | \`main\` |

→ Creates \`feature/PROJ-123-add-login-page\`
</example>

### AI Code Review on PR

<example>
**Trigger:** Pull Request Opened

**Get Diff:**
| Field | Value |
|-------|-------|
| **PR Number** | \`{{trigger.prNumber}}\` |

**AI Code Review:**
| Field | Value |
|-------|-------|
| **Diff** | \`{{nodes.get_diff.content}}\` |
| **Focus** | \`security, performance\` |

**Comment on PR:**
| Field | Value |
|-------|-------|
| **Body** | \`## AI Review\\n{{nodes.ai_review.summary}}\` |
</example>

## Node Outputs

<outputref>
{{nodes.create_branch.name}} → "feature/PROJ-123"
{{nodes.create_branch.url}} → "https://github.com/org/repo/tree/feature/PROJ-123"
{{nodes.create_pr.number}} → 42
{{nodes.create_pr.url}} → "https://github.com/org/repo/pull/42"
{{nodes.get_diff.content}} → "diff --git a/file.ts..."
</outputref>
`,

  "integrations/jira": `# Jira

Sync issues, automate transitions, and trigger workflows from Jira events.

## Setup

:::steps
### Create API Token

1. Go to [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Label: \`mitshe\`
4. Copy the token

### Connect to mitshe

1. Go to [Settings → Integrations](/settings/integrations)
2. Click **Connect** on Jira
3. Enter your Jira URL, email, and API token
4. Click **Test Connection** → **Save**

### Configure Webhook

1. In Jira: **Settings → System → WebHooks**
2. Click **Create a WebHook**
3. URL: \`https://localhost:3001/webhooks/jira/YOUR_ORG_ID\`
4. Select issue events (created, updated, etc.)
5. Save
:::

### Connection Fields

| Field | Example |
|-------|---------|
| **Jira URL** | \`https://your-company.atlassian.net\` |
| **Email** | Your Atlassian account email |
| **API Token** | Token from Atlassian |

:::info
**Permissions:** The API token inherits your Jira permissions. Make sure you have access to the projects you want to automate.
:::

## Available Nodes

### Triggers

<nodelist>
<node type="trigger" name="Issue Created" desc="When a new issue is created" />
<node type="trigger" name="Issue Updated" desc="When issue fields change" />
<node type="trigger" name="Issue Transitioned" desc="When status changes" />
<node type="trigger" name="Comment Added" desc="When someone comments" />
</nodelist>

### Actions

<nodelist>
<node type="jira" name="Get Issue" desc="Fetch issue details by key" />
<node type="jira" name="Update Issue" desc="Modify issue fields" />
<node type="jira" name="Add Comment" desc="Post a comment on an issue" />
<node type="jira" name="Transition Issue" desc="Move issue to different status" />
<node type="jira" name="Assign Issue" desc="Change assignee" />
<node type="jira" name="Add Label" desc="Add labels to an issue" />
<node type="jira" name="Create Issue" desc="Create a new issue" />
<node type="jira" name="Search Issues" desc="JQL query for issues" />
</nodelist>

## Trigger Filters

Filter which issues trigger your workflow:

<example>
**Jira Issue Created Trigger:**
| Field | Value |
|-------|-------|
| **Project** | \`PROJ\` |
| **Issue Type** | \`Bug, Task\` |
| **Labels** | \`ai-ready\` |
| **JQL** | \`priority = High AND component = Backend\` |
</example>

## Examples

### AI-Powered Issue Triage

<example>
**Trigger:** Issue Created (project = PROJ)

**AI Analyze:**
| Field | Value |
|-------|-------|
| **Content** | \`{{trigger.summary}}\\n{{trigger.description}}\` |
| **Instruction** | \`Analyze and return: priority (P1-P4), component, estimated_hours\` |

**Update Issue:**
| Field | Value |
|-------|-------|
| **Issue** | \`{{trigger.issueKey}}\` |
| **Priority** | \`{{nodes.ai_analyze.result.priority}}\` |
| **Components** | \`{{nodes.ai_analyze.result.component}}\` |

**Add Comment:**
| Field | Value |
|-------|-------|
| **Body** | \`AI Triage: {{nodes.ai_analyze.result.estimated_hours}}h estimated\` |
</example>

### Auto-transition on PR Merge

<example>
**Trigger:** GitHub PR Merged

**Search Issues:**
| Field | Value |
|-------|-------|
| **JQL** | \`key = {{trigger.branch | extractIssueKey}}\` |

**Transition Issue:**
| Field | Value |
|-------|-------|
| **Issue** | \`{{nodes.search.issues[0].key}}\` |
| **To Status** | \`Done\` |
</example>

## Node Outputs

<outputref>
{{trigger.issueKey}} → "PROJ-123"
{{trigger.summary}} → "Add login page"
{{trigger.description}} → "As a user, I want..."
{{trigger.status}} → "In Progress"
{{trigger.assignee.displayName}} → "John Doe"
{{nodes.search.issues}} → Array of issue objects
{{nodes.get_issue.fields.customfield_10001}} → Custom field value
</outputref>
`,

  "integrations/slack": `# Slack

Send notifications, alerts, and interactive messages to your team.

## Setup

:::steps
### Create Slack App

1. Go to [Slack API → Your Apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name: \`mitshe\`
4. Select your workspace

### Add Bot Permissions

1. Go to **OAuth & Permissions**
2. Scroll to **Bot Token Scopes**
3. Add the scopes listed below

### Install to Workspace

1. Click **Install to Workspace** → **Allow**
2. Copy the **Bot User OAuth Token** (starts with \`xoxb-\`)

### Connect in mitshe

1. Go to [Settings → Integrations](/settings/integrations)
2. Click **Connect** on Slack
3. Paste your Bot Token
4. Click **Test Connection** → **Save**
:::

### Required Scopes

| Scope | Purpose |
|-------|---------|
| \`chat:write\` | Send messages to channels |
| \`chat:write.public\` | Post to public channels without joining |
| \`channels:read\` | List available channels |
| \`users:read\` | Look up user information |

:::tip
**Private channels:** Invite the bot first with \`/invite @AI-Tasks\`
:::

## Available Nodes

### Actions

<nodelist>
<node type="slack" name="Send Message" desc="Post a message to a channel" />
<node type="slack" name="Send DM" desc="Send a direct message to a user" />
<node type="slack" name="Update Message" desc="Edit an existing message" />
<node type="slack" name="Add Reaction" desc="Add emoji reaction to a message" />
<node type="slack" name="Upload File" desc="Upload a file to a channel" />
</nodelist>

## Message Formatting

Slack uses [mrkdwn](https://api.slack.com/reference/surfaces/formatting) syntax:

| Syntax | Result |
|--------|--------|
| \`*bold*\` | **bold** |
| \`_italic_\` | _italic_ |
| \`~strike~\` | ~~strike~~ |
| \`\\\`code\\\`\` | \`code\` |
| \`\\\`\\\`\\\`code block\\\`\\\`\\\`\` | Code block |
| \`>quote\` | Block quote |
| \`<url|text>\` | Hyperlink |
| \`:emoji:\` | Emoji |
| \`<@U123>\` | Mention user |
| \`<#C123>\` | Mention channel |

## Examples

### Deployment Notification

<example>
**Trigger:** GitHub Push to \`main\`

**Slack Send Message:**
| Field | Value |
|-------|-------|
| **Channel** | \`#deployments\` |
| **Message** | See below |

\`\`\`
:rocket: *Deployment Started*

*Branch:* {{trigger.branch}}
*Commit:* \`{{trigger.commit.sha | truncate:7}}\`
*Author:* {{trigger.commit.author}}

<{{trigger.commit.url}}|View Commit>
\`\`\`
</example>

### AI Summary Alert

<example>
**Trigger:** Jira Issue Created

**AI Analyze:**
| Field | Value |
|-------|-------|
| **Content** | \`{{trigger.description}}\` |
| **Instruction** | \`Summarize in one sentence, identify urgency (low/medium/high)\` |

**Slack Send Message:**
| Field | Value |
|-------|-------|
| **Channel** | \`#engineering\` |
| **Message** | \`:ticket: *{{trigger.issueKey}}* — {{nodes.ai_analyze.result.summary}}\\n:warning: Urgency: {{nodes.ai_analyze.result.urgency}}\` |
</example>

### Error Alert with Mention

<example>
**Trigger:** Workflow Failed

**Slack Send Message:**
| Field | Value |
|-------|-------|
| **Channel** | \`#alerts\` |
| **Message** | \`:red_circle: *Workflow Failed*\\n\\nWorkflow: {{trigger.workflowName}}\\nError: {{trigger.error.message}}\\n\\ncc <@{{project.slackOwnerId}}>\` |
</example>

## Block Kit (Advanced)

For rich messages, use [Block Kit](https://api.slack.com/block-kit):

<example>
**Slack Send Message:**
| Field | Value |
|-------|-------|
| **Channel** | \`#reviews\` |
| **Blocks** | JSON block kit payload |

\`\`\`json
[
  {
    "type": "section",
    "text": { "type": "mrkdwn", "text": "*PR Ready for Review*" }
  },
  {
    "type": "section",
    "fields": [
      { "type": "mrkdwn", "text": "*Title:* {{trigger.pr.title}}" },
      { "type": "mrkdwn", "text": "*Author:* {{trigger.pr.author}}" }
    ]
  },
  {
    "type": "actions",
    "elements": [
      { "type": "button", "text": { "type": "plain_text", "text": "View PR" }, "url": "{{trigger.pr.url}}" }
    ]
  }
]
\`\`\`
</example>

## Node Outputs

<outputref>
{{nodes.send_message.ts}} → "1234567890.123456"
{{nodes.send_message.channel}} → "C0123456789"
{{nodes.send_message.permalink}} → "https://workspace.slack.com/archives/..."
</outputref>
`,

  "integrations/gitlab": `# GitLab

Automate Git operations with GitLab — branches, merge requests, pipelines.

## Setup

:::steps
### Create Personal Access Token

1. Go to GitLab → **Preferences → Access Tokens**
2. For self-hosted: \`https://your-gitlab.com/-/profile/personal_access_tokens\`
3. Token name: \`mitshe\`
4. Expiration: 90 days (recommended)
5. Select scopes listed below

### Connect to mitshe

1. Go to [Settings → Integrations](/settings/integrations)
2. Click **Connect** on GitLab
3. Enter your GitLab URL and token
4. Click **Test Connection** → **Save**

### Enable Projects

1. Go to [Settings → Repositories](/settings/repositories)
2. Click **Sync from GitLab**
3. Toggle on projects you want to use
:::

### Required Token Scopes

| Scope | Purpose |
|-------|---------|
| \`api\` | Full API access |
| \`read_repository\` | Clone repositories |
| \`write_repository\` | Push code |

:::info
**Self-hosted GitLab:** Fully supported. Just enter your GitLab instance URL during setup.
:::

## Available Nodes

### Triggers

<nodelist>
<node type="trigger" name="Push" desc="When code is pushed to a branch" />
<node type="trigger" name="Merge Request" desc="When MR is opened, updated, or merged" />
<node type="trigger" name="Pipeline" desc="When pipeline status changes" />
<node type="trigger" name="Tag" desc="When a tag is created" />
</nodelist>

### Actions

<nodelist>
<node type="git" name="Create Branch" desc="Create a new branch from ref" />
<node type="git" name="Commit Files" desc="Commit file changes" />
<node type="git" name="Create MR" desc="Open a merge request" />
<node type="git" name="Merge MR" desc="Merge a merge request" />
<node type="git" name="Get Diff" desc="Fetch MR or branch diff" />
<node type="git" name="Add MR Comment" desc="Comment on a merge request" />
<node type="git" name="Trigger Pipeline" desc="Start a CI/CD pipeline" />
</nodelist>

## Examples

### Auto-create Branch from Issue

<example>
**Trigger:** Jira Issue Created

**Create Branch:**
| Field | Value |
|-------|-------|
| **Project** | \`{{project.gitlabPath}}\` |
| **Branch Name** | \`feature/{{trigger.issueKey}}\` |
| **Ref** | \`main\` |

**Create MR (Draft):**
| Field | Value |
|-------|-------|
| **Source Branch** | \`feature/{{trigger.issueKey}}\` |
| **Target Branch** | \`main\` |
| **Title** | \`Draft: {{trigger.summary}}\` |
| **Description** | \`Closes {{trigger.issueKey}}\\n\\n{{trigger.description}}\` |
</example>

### AI Code Review on MR

<example>
**Trigger:** Merge Request Opened

**Get Diff:**
| Field | Value |
|-------|-------|
| **MR IID** | \`{{trigger.mr.iid}}\` |

**AI Code Review:**
| Field | Value |
|-------|-------|
| **Diff** | \`{{nodes.get_diff.content}}\` |
| **Focus** | \`security, performance, best practices\` |

**Add MR Comment:**
| Field | Value |
|-------|-------|
| **MR IID** | \`{{trigger.mr.iid}}\` |
| **Body** | \`## AI Code Review\\n\\n{{nodes.ai_review.summary}}\\n\\n**Score:** {{nodes.ai_review.score}}/10\` |
</example>

### Auto-merge on Pipeline Success

<example>
**Trigger:** Pipeline Succeeded (branch = \`main\`)

**Condition:**
\`{{trigger.mr.approvals >= 2}}\`

**Merge MR:**
| Field | Value |
|-------|-------|
| **MR IID** | \`{{trigger.mr.iid}}\` |
| **Squash** | \`true\` |
| **Delete Source** | \`true\` |
</example>

## Node Outputs

<outputref>
{{trigger.mr.iid}} → 42
{{trigger.mr.title}} → "Add login feature"
{{trigger.mr.source_branch}} → "feature/PROJ-123"
{{nodes.create_mr.web_url}} → "https://gitlab.com/org/repo/-/merge_requests/42"
{{nodes.create_branch.name}} → "feature/PROJ-123"
{{nodes.get_diff.content}} → "diff --git a/file.ts..."
</outputref>
`,

  "integrations/youtrack": `# YouTrack

Sync issues and automate project management with JetBrains YouTrack.

## Setup

:::steps
### Create Permanent Token

1. Go to YouTrack → **Profile → Account Security**
2. Or: \`https://your-youtrack.myjetbrains.com/users/me\`
3. Under **Tokens**, click **New token**
4. Name: \`mitshe\`
5. Scope: **YouTrack**
6. Copy the token

### Connect to mitshe

1. Go to [Settings → Integrations](/settings/integrations)
2. Click **Connect** on YouTrack
3. Enter your YouTrack URL and token
4. Click **Test Connection** → **Save**

### Configure Webhook (for triggers)

1. In YouTrack: **Administration → Integrations → Webhooks**
2. Click **New webhook**
3. URL: \`https://localhost:3001/webhooks/youtrack/YOUR_ORG_ID\`
4. Select events (issue created, updated, etc.)
5. Save
:::

:::info
**Cloud & Self-hosted:** Both YouTrack Cloud and YouTrack Server are supported.
:::

## Available Nodes

### Triggers

<nodelist>
<node type="trigger" name="Issue Created" desc="When a new issue is created" />
<node type="trigger" name="Issue Updated" desc="When issue fields change" />
<node type="trigger" name="State Changed" desc="When issue state changes" />
<node type="trigger" name="Comment Added" desc="When someone comments" />
</nodelist>

### Actions

<nodelist>
<node type="jira" name="Get Issue" desc="Fetch issue details by ID" />
<node type="jira" name="Update Issue" desc="Modify issue fields" />
<node type="jira" name="Add Comment" desc="Post a comment" />
<node type="jira" name="Change State" desc="Update issue state" />
<node type="jira" name="Create Issue" desc="Create a new issue" />
<node type="jira" name="Search Issues" desc="Query issues" />
<node type="jira" name="Add Tag" desc="Add tags to an issue" />
</nodelist>

## Examples

### AI Issue Analysis

<example>
**Trigger:** Issue Created (project = PROJ)

**AI Analyze:**
| Field | Value |
|-------|-------|
| **Content** | \`{{trigger.summary}}\\n{{trigger.description}}\` |
| **Instruction** | \`Classify: bug/feature/task. Estimate: hours. Suggest assignee team.\` |

**Update Issue:**
| Field | Value |
|-------|-------|
| **Issue ID** | \`{{trigger.issueId}}\` |
| **Type** | \`{{nodes.ai_analyze.result.type}}\` |
| **Estimation** | \`{{nodes.ai_analyze.result.hours}}h\` |

**Add Comment:**
| Field | Value |
|-------|-------|
| **Body** | \`Suggested team: {{nodes.ai_analyze.result.team}}\` |
</example>

### Link Issue to Git Branch

<example>
**Trigger:** GitHub Branch Created (pattern: \`*-PROJ-*\`)

**Search Issues:**
| Field | Value |
|-------|-------|
| **Query** | \`issue id: {{trigger.branch | extractIssueId}}\` |

**Update Issue:**
| Field | Value |
|-------|-------|
| **Issue ID** | \`{{nodes.search.issues[0].id}}\` |
| **State** | \`In Progress\` |

**Add Comment:**
| Field | Value |
|-------|-------|
| **Body** | \`Branch created: \`{{trigger.branch}}\`\` |
</example>

## Node Outputs

<outputref>
{{trigger.issueId}} → "PROJ-123"
{{trigger.summary}} → "Fix login bug"
{{trigger.description}} → "Users cannot login when..."
{{trigger.reporter.fullName}} → "John Doe"
{{trigger.state.name}} → "Open"
{{nodes.search.issues}} → Array of issue objects
{{nodes.create_issue.id}} → "PROJ-456"
</outputref>

## Query Syntax

YouTrack uses its own query language:

<example>
**Search Issues:**
| Query | Description |
|-------|-------------|
| \`project: PROJ\` | Issues in project |
| \`state: Open\` | Open issues |
| \`assignee: me\` | Assigned to token owner |
| \`created: today\` | Created today |
| \`tag: urgent\` | Has urgent tag |
| \`#unresolved\` | All unresolved |
</example>
`,

  "integrations/obsidian": `# Obsidian

Connect your Obsidian vault to automate note-taking and knowledge management.

## What is Obsidian?

[Obsidian](https://obsidian.md) is a powerful knowledge base that works on top of local Markdown files. With mitshe, you can:

- **Search your notes** and use them as context for AI
- **Create notes** automatically from workflow outputs
- **Update existing notes** with new information
- **Build knowledge bases** that grow with your work

## Setup

:::steps
### Install Local REST API Plugin

1. Open Obsidian → **Settings → Community plugins**
2. Browse and search for **Local REST API**
3. Install and **Enable** the plugin
4. Go to plugin settings and **copy the API key**

### Start Obsidian

The plugin only works when Obsidian is running. Keep it open or running in background.

### Connect to mitshe

1. Go to [Settings → Integrations](/settings/integrations)
2. Click **Connect** on Obsidian
3. Enter your API key
4. URL: \`https://127.0.0.1:27124\` (default)
5. Click **Test Connection** → **Save**
:::

:::warning
**Obsidian must be running** for the integration to work. The Local REST API plugin serves requests only when the app is open.
:::

## Available Nodes

### Actions

<nodelist>
<node type="action" name="Get Note" desc="Fetch note content by path" />
<node type="action" name="Create Note" desc="Create a new note in your vault" />
<node type="action" name="Update Note" desc="Replace note content" />
<node type="action" name="Append to Note" desc="Add content to end of note" />
<node type="action" name="Search Notes" desc="Search across your vault" />
</nodelist>

## Examples

### Save AI Summary to Obsidian

<example>
**Trigger:** Jira Issue Closed

**AI Analyze:**
| Field | Value |
|-------|-------|
| **Content** | \`{{trigger.description}}\\n{{trigger.comments}}\` |
| **Instruction** | \`Summarize the issue resolution in 2-3 sentences\` |

**Obsidian Create Note:**
| Field | Value |
|-------|-------|
| **Path** | \`Projects/{{trigger.projectKey}}/{{trigger.issueKey}}.md\` |
| **Content** | See below |

\`\`\`markdown
# {{trigger.issueKey}}: {{trigger.summary}}

**Status:** Resolved
**Date:** {{trigger.resolvedDate}}

## Summary
{{nodes.ai_analyze.result.summary}}

## Original Description
{{trigger.description}}
\`\`\`
</example>

### Build Meeting Notes from PR

<example>
**Trigger:** GitHub PR Merged

**AI Prompt:**
| Field | Value |
|-------|-------|
| **Prompt** | \`Create a changelog entry for: {{trigger.pr.title}}\\n\\nChanges:\\n{{trigger.pr.body}}\` |

**Obsidian Append to Note:**
| Field | Value |
|-------|-------|
| **Path** | \`Changelog/{{trigger.mergedAt | formatDate:'YYYY-MM'}}.md\` |
| **Content** | \`\\n## {{trigger.pr.title}}\\n{{nodes.ai_prompt.content}}\\n\` |
</example>

### Search Knowledge Base for Context

<example>
**Trigger:** Slack Message (mentions bot)

**Obsidian Search:**
| Field | Value |
|-------|-------|
| **Query** | \`{{trigger.message.text}}\` |
| **Limit** | \`5\` |

**AI Prompt:**
| Field | Value |
|-------|-------|
| **System** | \`You are a helpful assistant with access to a knowledge base.\` |
| **Prompt** | \`Question: {{trigger.message.text}}\\n\\nRelevant notes:\\n{{nodes.search.notes | map:'content' | join:'\\n---\\n'}}\` |

**Slack Reply:**
| Field | Value |
|-------|-------|
| **Thread** | \`{{trigger.message.ts}}\` |
| **Message** | \`{{nodes.ai_prompt.content}}\` |
</example>

## Node Outputs

<outputref>
{{nodes.get_note.content}} → "# Note Title\\n\\nNote content..."
{{nodes.get_note.path}} → "folder/note.md"
{{nodes.get_note.frontmatter.tags}} → ["tag1", "tag2"]
{{nodes.search.notes}} → Array of matching notes
{{nodes.search.notes[0].path}} → "matching/note.md"
{{nodes.create_note.path}} → "new/note.md"
</outputref>

## Path Syntax

Notes are referenced by their path relative to vault root:

| Path | Description |
|------|-------------|
| \`note.md\` | Note in vault root |
| \`folder/note.md\` | Note in folder |
| \`folder/sub/note.md\` | Nested folders |

:::tip
You can omit the \`.md\` extension — it's added automatically.
:::

## Frontmatter

Access YAML frontmatter from notes:

<example>
**Note content:**
\`\`\`markdown
---
tags: [project, active]
status: in-progress
assignee: john
---

# Project Notes
...
\`\`\`

**Access in expressions:**
\`\`\`
{{nodes.get_note.frontmatter.tags}} → ["project", "active"]
{{nodes.get_note.frontmatter.status}} → "in-progress"
\`\`\`
</example>

## Best Practices

:::info
**Organize by project.** Use folder structure like \`Projects/PROJ/\` to keep notes organized.
:::

:::tip
**Use templates.** Create consistent note formats with frontmatter for better searchability.
:::

:::warning
**Mind the size.** Very large notes (>100KB) may slow down searches. Split into smaller files.
:::
`,

  "deployment/docker": `# Docker Deployment

Run mitshe with a single Docker command. Everything included — frontend, API, SQLite, Redis.

## Quick Start

\`\`\`bash
docker run -d --name mitshe \\
  -p 3000:3000 -p 3001:3001 \\
  -v mitshe-data:/build/data \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  ghcr.io/mitshe/mitshe:latest
\`\`\`

Open [http://localhost:3000](http://localhost:3000) and create your admin account.

:::info
**Docker socket** is mounted so mitshe can run workflow tasks in isolated containers on the host.
:::

## What's Included

The container bundles:
- **Next.js** frontend (port 3000)
- **NestJS** API (port 3001)
- **SQLite** database
- **Redis** for queues and caching
- **Workflow executor** image (auto-pulled on first workflow run)

## Data Persistence

All data is stored in the \`mitshe-data\` volume:

| Path | Contents |
|------|----------|
| \`/build/data/mitshe.db\` | SQLite database (users, workflows, tasks) |

:::warning
**Backup your volume.** The \`mitshe-data\` volume contains all your data.
:::

## First Setup

1. Open \`http://localhost:3000\`
2. Create your admin account (first user = admin)
3. Go to **Settings → Integrations** and add your GitHub/Jira token
4. Go to **Settings → AI Providers** and add your Claude/OpenAI key
5. Create a workflow from a template or from scratch

## Update

Your data persists across updates:

\`\`\`bash
docker stop mitshe && docker rm mitshe
docker pull ghcr.io/mitshe/mitshe:latest
docker run -d --name mitshe \\
  -p 3000:3000 -p 3001:3001 \\
  -v mitshe-data:/build/data \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  ghcr.io/mitshe/mitshe:latest
\`\`\`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| \`AUTH_MODE\` | \`selfhosted\` | \`selfhosted\` (email/password) or \`clerk\` |
| \`ENCRYPTION_KEY\` | auto-generated | AES-256 key for credential encryption |
| \`EXECUTOR_IMAGE\` | \`ghcr.io/mitshe/mitshe-executor:latest\` | Workflow executor Docker image |

### Custom encryption key

\`\`\`bash
docker run -d --name mitshe \\
  -p 3000:3000 -p 3001:3001 \\
  -v mitshe-data:/build/data \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -e ENCRYPTION_KEY=$(openssl rand -hex 32) \\
  ghcr.io/mitshe/mitshe:latest
\`\`\`

## Troubleshooting

### Container won't start

\`\`\`bash
docker logs mitshe
\`\`\`

### Workflows fail with "executor image not found"

The executor image is pulled automatically on first run. If it fails, pull manually:

\`\`\`bash
docker pull ghcr.io/mitshe/mitshe-executor:latest
\`\`\`

### Port conflicts

\`\`\`bash
docker run -p 8080:3000 -p 8081:3001 ...
\`\`\`
`,

  "deployment/development": `# Development Setup

Set up mitshe for local development with hot-reload.

## Prerequisites

- **Node.js 20+**
- **pnpm 9+** — \`corepack enable && corepack prepare pnpm@9 --activate\`
- **Docker** — for databases and workflow execution
- **just** — task runner: \`brew install just\` (macOS)

## Setup

\`\`\`bash
git clone https://github.com/mitshe/mitshe.git
cd mitshe
just setup
\`\`\`

## Run

\`\`\`bash
# Start databases + dev servers with hot-reload
just dev
\`\`\`

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)
- API Docs (Swagger): [http://localhost:3001/api](http://localhost:3001/api)

First visit: create your admin account.

## Build Workflow Executor

To run workflows locally, build the executor image once:

\`\`\`bash
just executor-build
\`\`\`

## Key Commands

| Command | Description |
|---------|-------------|
| \`just dev\` | Start dev servers (selfhosted auth) |
| \`just build\` | Build all packages |
| \`just typecheck\` | TypeScript check |
| \`just lint\` | ESLint |
| \`just test\` | Run tests |
| \`just check\` | Lint + typecheck + test |
| \`just db-migrate\` | Run database migrations |
| \`just db-studio\` | Open Prisma Studio |
| \`just executor-build\` | Build workflow executor image |

## Project Structure

\`\`\`
mitshe/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   ├── api/          # NestJS 11 backend
│   └── landing/      # Landing page
├── packages/
│   └── types/        # Shared TypeScript types
├── docker/
│   ├── light/        # All-in-one container
│   ├── dev/          # Dev infrastructure
│   ├── nginx/        # Nginx config
│   └── prod/         # Production compose
├── justfile          # Task runner
└── turbo.json        # Turborepo config
\`\`\`

## Environment Variables

Copy \`.env.example\` to \`.env\`. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| \`AUTH_MODE\` | \`selfhosted\` | \`selfhosted\` or \`clerk\` |
| \`DATABASE_URL\` | PostgreSQL localhost | Database connection |
| \`REDIS_URL\` | \`redis://localhost:6379\` | Redis connection |
| \`ENCRYPTION_KEY\` | (empty) | AES-256 key, auto-generated in Docker |

## Auth Modes

| Mode | Description |
|------|-------------|
| **Selfhosted** | Email/password JWT auth (default) |
| **Clerk** | Clerk auth with organizations, SSO |

## Troubleshooting

### Port 5432/6379 in use

Stop existing databases or change ports in \`docker/dev/docker-compose.yml\`.

### Prisma client not generated

\`\`\`bash
just db-generate
\`\`\`

### Workflow execution fails

Build the executor image: \`just executor-build\`
`,

  api: `# REST API

Access mitshe programmatically.

## Authentication

\`\`\`bash
curl https://localhost:3001/v1/tasks -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

Get your key at [Settings → API Keys](/settings/api-keys).

:::warning
Keep your API key secret. Never commit to version control.
:::

## Endpoints

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| \`GET\` | \`/tasks\` | List tasks |
| \`POST\` | \`/tasks\` | Create task |
| \`GET\` | \`/tasks/:id\` | Get task |
| \`POST\` | \`/tasks/:id/process\` | Start processing |

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| \`GET\` | \`/workflows\` | List workflows |
| \`GET\` | \`/workflows/:id\` | Get workflow |
| \`POST\` | \`/workflows/:id/run\` | Execute workflow |

## Rate limits

| Type | Limit |
|------|-------|
| Standard | 100/min |
| Workflow runs | 10/min |
| AI processing | 20/min |

## Example

\`\`\`bash
curl -X POST https://localhost:3001/v1/workflows/abc123/run \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"issueKey": "PROJ-456"}}'
\`\`\`

\`\`\`json
{ "executionId": "exec_789", "status": "running" }
\`\`\`
`,
};
