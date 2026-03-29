import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - mitshe",
  description: "Privacy Policy for mitshe workflow automation platform",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

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
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p>
              This Privacy Policy explains how mitshe (&quot;we&quot;,
              &quot;our&quot;, or &quot;the Service&quot;) collects, uses,
              stores, and protects your information when you use our workflow
              automation platform. We are committed to protecting your privacy
              and being transparent about our data practices.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>

            <h3 className="text-lg font-medium">2.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Name (if provided)</li>
              <li>Profile picture (if provided via OAuth)</li>
              <li>Authentication data managed by Clerk</li>
              <li>Organization/team information</li>
            </ul>

            <h3 className="text-lg font-medium">2.2 Integration Data</h3>
            <p>When you connect integrations, we may access:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>JIRA/YouTrack:</strong> Project data, issues, comments,
                user assignments
              </li>
              <li>
                <strong>GitLab/GitHub:</strong> Repository metadata, branches,
                merge requests, commits
              </li>
              <li>
                <strong>Slack:</strong> Channel names, user names for
                notifications
              </li>
              <li>
                <strong>OAuth tokens:</strong> Encrypted and stored to maintain
                connections
              </li>
            </ul>

            <h3 className="text-lg font-medium">2.3 Workflow Data</h3>
            <p>We store:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Workflow configurations and settings</li>
              <li>Execution logs and history</li>
              <li>Task data processed through workflows</li>
              <li>Trigger and action configurations</li>
            </ul>

            <h3 className="text-lg font-medium">2.4 API Keys (BYOK Model)</h3>
            <p>For AI providers and custom integrations:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>API keys are encrypted using AES-256-GCM encryption</li>
              <li>Keys are decrypted only at the moment of use</li>
              <li>
                We do NOT log, store, or have access to the content of your AI
                requests/responses
              </li>
              <li>
                AI provider usage is directly between you and the provider
              </li>
            </ul>

            <h3 className="text-lg font-medium">2.5 Usage Data</h3>
            <p>We automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Feature usage statistics (anonymous)</li>
              <li>Error reports and crash logs</li>
              <li>Performance metrics</li>
              <li>Browser type and device information</li>
              <li>IP address (for security purposes)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              3. How We Use Your Information
            </h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Provide the Service:</strong> Execute workflows, manage
                integrations, process tasks
              </li>
              <li>
                <strong>Authenticate:</strong> Verify your identity and manage
                access
              </li>
              <li>
                <strong>Communicate:</strong> Send important updates, security
                alerts, and notifications
              </li>
              <li>
                <strong>Improve:</strong> Analyze usage patterns to enhance
                features and performance
              </li>
              <li>
                <strong>Secure:</strong> Detect and prevent fraud, abuse, and
                security threats
              </li>
              <li>
                <strong>Support:</strong> Respond to your inquiries and provide
                assistance
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              4. Data Storage and Security
            </h2>
            <p>We implement industry-standard security measures:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Encryption at rest:</strong> Sensitive data is encrypted
                in our database
              </li>
              <li>
                <strong>Encryption in transit:</strong> All data transfers use
                TLS 1.3
              </li>
              <li>
                <strong>API key encryption:</strong> AES-256-GCM with secure key
                management
              </li>
              <li>
                <strong>Authentication:</strong> Secure authentication via Clerk
                with MFA support
              </li>
              <li>
                <strong>Access control:</strong> Role-based access within
                organizations
              </li>
              <li>
                <strong>Infrastructure:</strong> Hosted on secure, compliant
                cloud infrastructure
              </li>
              <li>
                <strong>Monitoring:</strong> Continuous security monitoring and
                logging
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">5. Data Sharing</h2>
            <p>We do NOT sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Service providers:</strong> Necessary third parties that
                help operate the Service
              </li>
              <li>
                <strong>Your integrations:</strong> Data sent to services you
                connect (JIRA, GitLab, etc.)
              </li>
              <li>
                <strong>Legal requirements:</strong> When required by law or to
                protect our rights
              </li>
              <li>
                <strong>Business transfers:</strong> In case of merger,
                acquisition, or asset sale
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">6. Third-Party Services</h2>
            <p>We use the following third-party services:</p>

            <h3 className="text-lg font-medium">6.1 Authentication</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Clerk</strong> - User authentication and session
                management
              </li>
            </ul>

            <h3 className="text-lg font-medium">
              6.2 Your Configured Integrations
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>JIRA, YouTrack, Linear (project management)</li>
              <li>GitLab, GitHub (version control)</li>
              <li>Slack, Teams (communication)</li>
            </ul>

            <h3 className="text-lg font-medium">6.3 AI Providers (BYOK)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Anthropic (Claude)</li>
              <li>OpenAI</li>
              <li>Other providers you configure</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Note: AI requests go directly to providers using your API keys. We
              do not intermediate or log this traffic.
            </p>

            <h3 className="text-lg font-medium">6.4 Analytics (if enabled)</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sentry - Error tracking and monitoring</li>
            </ul>

            <p>
              Each third-party service has its own privacy policy. We encourage
              you to review them.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">7. Cookies and Tracking</h2>
            <p>We use cookies for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Essential cookies:</strong> Authentication, security,
                and basic functionality
              </li>
              <li>
                <strong>Preference cookies:</strong> Remember your settings
                (theme, language)
              </li>
              <li>
                <strong>Analytics cookies:</strong> Understand usage patterns
                (can be declined)
              </li>
            </ul>
            <p>
              You can manage cookie preferences through the cookie consent
              banner or your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">8. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account data:</strong> Retained while your account is
                active
              </li>
              <li>
                <strong>Workflow execution logs:</strong> 30 days by default
                (configurable)
              </li>
              <li>
                <strong>Integration tokens:</strong> Until you disconnect the
                integration
              </li>
              <li>
                <strong>Deleted accounts:</strong> Data removed within 30 days,
                backups within 90 days
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">9. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Correction:</strong> Update inaccurate or incomplete
                data
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your data
                (&quot;right to be forgotten&quot;)
              </li>
              <li>
                <strong>Portability:</strong> Export your data in a
                machine-readable format
              </li>
              <li>
                <strong>Restriction:</strong> Limit how we process your data
              </li>
              <li>
                <strong>Objection:</strong> Object to certain types of
                processing
              </li>
              <li>
                <strong>Withdraw consent:</strong> Revoke previously given
                consent
              </li>
            </ul>
            <p>
              To exercise these rights, contact us via GitHub or through your
              account settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              10. International Data Transfers
            </h2>
            <p>
              Your data may be processed in countries other than your own. We
              ensure appropriate safeguards are in place for international
              transfers, including standard contractual clauses where required.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              11. Children&apos;s Privacy
            </h2>
            <p>
              The Service is not intended for users under 18 years of age. We do
              not knowingly collect personal information from children. If we
              learn we have collected data from a child, we will delete it
              promptly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">12. Self-Hosting</h2>
            <p>
              mitshe is open-source and can be self-hosted. When you self-host:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are the data controller for your instance</li>
              <li>
                This privacy policy does not apply to self-hosted instances
              </li>
              <li>
                You are responsible for your own data handling and privacy
                compliance
              </li>
              <li>
                No data is sent to us from self-hosted instances (unless you
                configure it)
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              13. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes via email or through the
              Service. The &quot;Last updated&quot; date at the top indicates
              when the policy was last revised. Continued use after changes
              constitutes acceptance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">14. Contact Us</h2>
            <p>
              For privacy-related questions or to exercise your rights, please
              open an issue on our{" "}
              <a
                href="https://github.com/3uba"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repository
              </a>{" "}
              or contact us through the channels provided in your account
              settings.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
