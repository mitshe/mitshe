# Contributing to mitshe

Thank you for your interest in contributing to mitshe! This document provides guidelines and information for contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/YOUR_USERNAME/web.git
   cd web
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Set up environment** - Copy `.env.example` to `.env.local` and configure

## Development Workflow

1. Create a new branch for your feature/fix
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run checks before committing
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

4. Commit your changes with a clear message
   ```bash
   git commit -m "feat: add new feature"
   ```

5. Push to your fork and create a Pull Request

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused

## Pull Request Guidelines

- **One PR per feature/fix** - Keep PRs focused
- **Clear description** - Explain what and why
- **Update documentation** - If needed
- **Add tests** - For new features
- **Pass all checks** - Lint, typecheck, build

## Reporting Issues

When reporting issues, please include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
- Screenshots if applicable

## Feature Requests

Feature requests are welcome! Please:

- Check existing issues first
- Describe the use case
- Explain the expected behavior

## Questions?

- Open a [GitHub Issue](https://github.com/mitshe/web/issues)
- Reach out on [Twitter/X](https://x.com/t0tty3)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
