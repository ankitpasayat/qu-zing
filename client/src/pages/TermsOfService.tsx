export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Last updated: November 27, 2025
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                By accessing or using Qu-Zing! ("the Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Description of Service
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Qu-Zing! is a real-time multiplayer trivia game designed as a Discord Activity. 
                The Service allows users to play trivia games with friends in Discord voice channels.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. User Conduct
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You agree to use the Service in compliance with all applicable laws and Discord's Terms of Service. 
                You will not:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to exploit, hack, or disrupt the Service</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Use automated systems to interact with the Service</li>
                <li>Impersonate others or misrepresent your affiliation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Discord Integration
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Qu-Zing! integrates with Discord and requires a Discord account to use. 
                Your use of Discord is subject to Discord's own Terms of Service and Privacy Policy.
                We access limited Discord profile information (username, avatar, user ID) to provide the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Intellectual Property
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                All content, features, and functionality of the Service are owned by Qu-Zing! 
                and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Disclaimer of Warranties
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The Service is provided "as is" and "as available" without warranties of any kind, 
                either express or implied. We do not guarantee that the Service will be uninterrupted, 
                secure, or error-free.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To the maximum extent permitted by law, Qu-Zing! shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages arising from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Changes to Terms
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of any 
                material changes by updating the "Last updated" date. Your continued use of the Service 
                after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Termination
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may terminate or suspend your access to the Service at any time, without prior notice, 
                for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Contact Information
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about these Terms, please contact us through our Discord server 
                or via email at support@qu-zing.com.
              </p>
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
