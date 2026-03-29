import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - mitshe",
  description: "Terms of Service for mitshe workflow automation platform",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing or using mitshe (&quot;the Service&quot;), you agree
              to be bound by these Terms of Service. If you do not agree to
              these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p>
              mitshe is an open-source workflow automation platform designed for
              development teams. The Service provides:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Visual Workflow Builder</strong> - Create automated
                workflows using a drag-and-drop interface
              </li>
              <li>
                <strong>Integration Hub</strong> - Connect to JIRA, GitLab,
                GitHub, Slack, and other tools
              </li>
              <li>
                <strong>AI-Powered Automation</strong> - Use AI providers
                (Claude, OpenAI) to analyze and process tasks
              </li>
              <li>
                <strong>Task Management</strong> - Track and manage development
                tasks across projects
              </li>
              <li>
                <strong>Repository Sync</strong> - Import and manage Git
                repositories
              </li>
            </ul>
            <p>
              The Service operates on a &quot;Bring Your Own Key&quot; (BYOK)
              model for AI providers, meaning you provide and manage your own
              API keys.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">3. Account Registration</h2>
            <p>To use the Service, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create an account using valid credentials</li>
              <li>Provide accurate and complete information</li>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Not create accounts for others without authorization</li>
            </ul>
            <p>
              Account authentication is handled by Clerk, a third-party
              authentication provider. By creating an account, you also agree to
              Clerk&apos;s terms of service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">4. User Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the security of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>
                Ensuring your use complies with applicable laws and regulations
              </li>
              <li>
                The security and proper handling of any API keys you provide
              </li>
              <li>
                Any costs incurred from third-party services (AI providers,
                integrations)
              </li>
              <li>
                Ensuring workflows do not perform malicious or harmful actions
              </li>
              <li>
                Respecting rate limits and usage guidelines of connected
                services
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              5. API Keys and Third-Party Services (BYOK)
            </h2>
            <p>
              The Service allows you to connect your own API keys for AI
              providers and other integrations. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You are responsible for obtaining API keys from respective
                providers (OpenAI, Anthropic, etc.)
              </li>
              <li>
                You are responsible for any charges from third-party providers
                based on your usage
              </li>
              <li>
                API keys are encrypted and stored securely, but you use them at
                your own risk
              </li>
              <li>
                We do not monitor, log, or store the content of requests made to
                AI providers
              </li>
              <li>
                We are not responsible for third-party service outages, changes,
                or terminations
              </li>
              <li>
                Your use of third-party services must comply with their
                respective terms
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Integrations</h2>
            <p>
              When connecting integrations (JIRA, GitLab, GitHub, Slack, etc.),
              you:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Authorize the Service to access your data on those platforms
              </li>
              <li>Grant permissions according to the OAuth scopes requested</li>
              <li>
                Are responsible for ensuring you have authority to connect
                organizational accounts
              </li>
              <li>
                Can revoke access at any time through the Service or the
                third-party platform
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              7. Workflows and Automation
            </h2>
            <p>
              Workflows you create may perform automated actions. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Test workflows thoroughly before enabling them in production
              </li>
              <li>Monitor workflow executions and their effects</li>
              <li>Not create workflows that spam, harass, or harm others</li>
              <li>
                Not use workflows to violate the terms of connected services
              </li>
              <li>
                Accept responsibility for all actions performed by your
                workflows
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Prohibited Uses</h2>
            <p>You may not use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit malware or malicious code</li>
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Interfere with the Service or other users</li>
              <li>Generate spam or unsolicited communications</li>
              <li>Process illegal or harmful content through AI providers</li>
              <li>Circumvent usage limits or security measures</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Intellectual Property</h2>
            <p>
              mitshe is open-source software. The source code is available under
              the terms specified in the project&apos;s license on GitHub. Your
              workflows, configurations, and data remain your property. You
              grant us a limited license to process your data solely to provide
              the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">10. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee
              uninterrupted access. The Service may be temporarily unavailable
              due to maintenance, updates, or circumstances beyond our control.
              We are not liable for any losses due to service interruptions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              11. Limitation of Liability
            </h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF
              ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY
              LAW:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                We disclaim all warranties of merchantability, fitness for a
                particular purpose, and non-infringement
              </li>
              <li>
                We shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages
              </li>
              <li>
                Our total liability shall not exceed the amount you paid us in
                the past 12 months, if any
              </li>
              <li>
                We are not liable for actions taken by workflows you create
              </li>
              <li>
                We are not liable for charges incurred from third-party
                providers
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless mitshe and its
              maintainers from any claims, damages, or expenses arising from
              your use of the Service, violation of these terms, or infringement
              of any rights of third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">13. Termination</h2>
            <p>
              You may stop using the Service at any time. We reserve the right
              to suspend or terminate your access if you violate these terms.
              Upon termination, your right to use the Service ceases, but
              provisions that should survive (limitation of liability,
              indemnification) remain in effect.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">14. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes
              will be posted on this page with an updated date. Continued use of
              the Service after changes constitutes acceptance of the modified
              terms. For significant changes, we may notify you via email or
              in-app notification.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">15. Governing Law</h2>
            <p>
              These terms are governed by the laws of the jurisdiction where the
              Service is operated, without regard to conflict of law principles.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">16. Contact</h2>
            <p>
              For questions about these Terms, please open an issue on our{" "}
              <a
                href="https://github.com/3uba"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
