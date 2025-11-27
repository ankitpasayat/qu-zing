export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Last updated: November 27, 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Qu-Zing! ("we", "our", or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, and safeguard your information 
                when you use our Discord Activity.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Information We Collect
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We collect the following information through Discord's OAuth2:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Discord User ID:</strong> To identify you in game sessions</li>
                <li><strong>Username:</strong> To display your name to other players</li>
                <li><strong>Avatar:</strong> To show your profile picture in the game</li>
                <li><strong>Guild/Server ID:</strong> To manage game sessions within servers</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                We also collect:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Game Statistics:</strong> Scores, answers, and game history</li>
                <li><strong>Session Data:</strong> Temporary data for active game sessions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use the collected information to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Provide and maintain the game service</li>
                <li>Display your identity to other players in the game</li>
                <li>Track game progress and scores</li>
                <li>Improve our service and user experience</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Data Storage and Security
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Game session data is stored temporarily in memory and is deleted when sessions end. 
                We implement appropriate security measures to protect your information against 
                unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Data Sharing
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to outside parties. 
                Your Discord information is used solely within the game service and is visible to other 
                players in your game session.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Third-Party Services
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Our service integrates with Discord. Your use of Discord is governed by 
                <a 
                  href="https://discord.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                > Discord's Privacy Policy</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Your Rights
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Request deletion of your data</li>
                <li>Revoke access to your Discord account</li>
                <li>Opt out of data collection by not using the service</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mt-4">
                To revoke Qu-Zing!'s access to your Discord account, visit Discord's 
                User Settings → Authorized Apps and remove Qu-Zing!.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Children's Privacy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Our service is not intended for users under the age of 13 (or the minimum age 
                required by Discord in your country). We do not knowingly collect personal 
                information from children under this age.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Data Retention
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Active game session data is retained only for the duration of the game session. 
                Aggregated analytics data may be retained for service improvement purposes. 
                You can request deletion of your data at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any 
                changes by updating the "Last updated" date at the top of this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                11. Contact Us
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Through our Discord server</li>
                <li>Email: privacy@qu-zing.com</li>
              </ul>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <a 
              href="/"
              className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
            >
              ← Back to Game
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
