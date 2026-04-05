# Mitshe Workflow Executor
# Base image for isolated workflow execution environments
# Contains: Node.js 22, Git, Claude Code, OpenClaw, Python, common dev tools

FROM node:22-bookworm

LABEL maintainer="mitshe"
LABEL description="Isolated execution environment for mitshe workflows"
LABEL version="1.0"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Version control
    git \
    git-lfs \
    # Network tools
    curl \
    wget \
    httpie \
    jq \
    # Build essentials
    build-essential \
    gcc \
    g++ \
    make \
    cmake \
    # Python
    python3 \
    python3-pip \
    python3-venv \
    # Shell utilities
    bash \
    zsh \
    vim \
    nano \
    less \
    tree \
    htop \
    # Archive tools
    zip \
    unzip \
    tar \
    gzip \
    # SSL/TLS
    ca-certificates \
    openssl \
    # Process management
    procps \
    # DNS tools
    dnsutils \
    # SSH client (for git ssh)
    openssh-client \
    # Misc
    locales \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Set locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Install AI agent CLIs globally
RUN npm install -g @anthropic-ai/claude-code openclaw@latest

# Install common global npm packages (yarn is already in node image)
RUN npm install -g \
    typescript \
    ts-node \
    tsx \
    pnpm \
    eslint \
    prettier \
    jest \
    vitest \
    nodemon \
    pm2 \
    rimraf \
    dotenv-cli

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install GitLab CLI (glab) - detect architecture
RUN ARCH=$(dpkg --print-architecture) && \
    curl -fsSL "https://gitlab.com/gitlab-org/cli/-/releases/v1.46.1/downloads/glab_1.46.1_linux_${ARCH}.deb" -o /tmp/glab.deb && \
    dpkg -i /tmp/glab.deb && \
    rm /tmp/glab.deb \
    || echo "glab installation failed, skipping..."

# Install Docker CE for DinD support
RUN curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
RUN mkdir -p /usr/local/lib/docker/cli-plugins && \
    ARCH=$(dpkg --print-architecture) && \
    curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose && \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Create non-root user for execution (with docker group)
RUN useradd -m -s /bin/bash -G sudo,docker executor \
    && echo "executor ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Create workspace directory
RUN mkdir -p /workspace && chown executor:executor /workspace

# Create directory for task-specific data
RUN mkdir -p /task && chown executor:executor /task

# Create runner directory
RUN mkdir -p /runner && chown executor:executor /runner

# Copy workflow runner source
COPY --chown=executor:executor workflow-runner /runner

# Copy session server
COPY --chown=executor:executor session-server /session

# Install runner dependencies and build
WORKDIR /runner
RUN npm install && npm run build

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER executor

# Configure git for the executor user
RUN git config --global init.defaultBranch main \
    && git config --global pull.rebase false \
    && git config --global user.email "executor@mitshe.com" \
    && git config --global user.name "Mitshe Executor"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && git --version && claude --version && openclaw --version || exit 1

# Default entrypoint for workflow execution
# Job JSON is passed via stdin or --job argument
ENTRYPOINT ["node", "/runner/dist/runner.js"]

# Default: wait for input (can be overridden)
CMD []
