import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Users, Calendar, Shield } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center text-white font-bold text-xl">
              W
            </div>
            <h1 className="text-2xl font-bold">WorkSphere</h1>
          </div>
          <div className="flex gap-4 items-center">
            <nav className="hidden md:flex gap-6 mr-4">
              <Link href="#features" className="text-gray-600 hover:text-violet-600 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-violet-600 transition-colors">
                Pricing
              </Link>
              <Link href="#testimonials" className="text-gray-600 hover:text-violet-600 transition-colors">
                Testimonials
              </Link>
            </nav>
            <Link href="/login">
              <Button variant="outline" className="font-medium">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="font-medium">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Manage Work <span className="text-violet-600 dark:text-violet-400">Effortlessly</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
                WorkSphere helps teams plan, track, and manage work efficiently with powerful collaboration tools and
                end-to-end security.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="px-8 py-6 text-lg font-medium">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="px-8 py-6 text-lg font-medium">
                    View Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold mb-4">Why Choose WorkSphere?</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Our comprehensive platform provides everything you need to manage projects and collaborate with your
                team.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Task Management</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Create, assign, and track tasks with customizable workflows. Set priorities, due dates, and monitor
                  progress in real-time.
                </p>
              </div>

              <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Team Collaboration</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Chat securely with team members and share resources in real-time. End-to-end encryption ensures your
                  communications stay private.
                </p>
              </div>

              <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Project Planning</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Organize projects with customizable workspaces. Set milestones, track deadlines, and visualize project
                  timelines.
                </p>
              </div>

              <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h4 className="text-xl font-semibold mb-3">Advanced Security</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Multi-factor authentication, role-based access control, and end-to-end encrypted chat keep your data
                  secure.
                </p>
              </div>

              <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-violet-600 dark:text-violet-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold mb-3">Detailed Analytics</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Track project progress, team performance, and resource allocation with comprehensive dashboards and
                  reports.
                </p>
              </div>

              <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-violet-600 dark:text-violet-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold mb-3">Smart Notifications</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Stay updated with customizable notifications for task assignments, comments, mentions, and approaching
                  deadlines.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Choose the plan that fits your team's needs. All plans include core features.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden">
                <div className="p-6 border-b">
                  <h4 className="text-xl font-semibold mb-1">Free</h4>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">For small teams getting started</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">/month</span>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Up to 5 team members</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>2 workspaces</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Basic task management</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>1GB storage</span>
                    </li>
                  </ul>
                  <Link href="/register" className="block mt-6">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden border-2 border-violet-500 transform scale-105">
                <div className="p-6 border-b bg-violet-50 dark:bg-violet-900/20">
                  <div className="inline-block px-3 py-1 bg-violet-100 dark:bg-violet-800 text-violet-600 dark:text-violet-300 rounded-full text-xs font-medium mb-3">
                    MOST POPULAR
                  </div>
                  <h4 className="text-xl font-semibold mb-1">Pro</h4>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">For growing teams</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">$12</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">/user/month</span>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Unlimited team members</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Unlimited workspaces</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Advanced task management</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>10GB storage</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                  <Link href="/register?plan=pro" className="block mt-6">
                    <Button className="w-full">Start Free Trial</Button>
                  </Link>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden">
                <div className="p-6 border-b">
                  <h4 className="text-xl font-semibold mb-1">Enterprise</h4>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">For large organizations</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">$29</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">/user/month</span>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>SSO & advanced security</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Custom integrations</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>Unlimited storage</span>
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>24/7 dedicated support</span>
                    </li>
                  </ul>
                  <Link href="/contact-sales" className="block mt-6">
                    <Button variant="outline" className="w-full">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold mb-4">What Our Customers Say</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Trusted by thousands of teams around the world.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center text-xl font-bold text-violet-600 dark:text-violet-400">
                    JD
                  </div>
                  <div className="ml-4">
                    <h5 className="font-semibold">Jane Doe</h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Product Manager, TechCorp</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  "WorkSphere has transformed how our team collaborates. The intuitive interface and powerful features
                  have increased our productivity by 30%."
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center text-xl font-bold text-violet-600 dark:text-violet-400">
                    MS
                  </div>
                  <div className="ml-4">
                    <h5 className="font-semibold">Michael Smith</h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">CTO, StartupX</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  "The security features in WorkSphere give us peace of mind. End-to-end encryption and MFA are
                  must-haves for our sensitive projects."
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center text-xl font-bold text-violet-600 dark:text-violet-400">
                    AL
                  </div>
                  <div className="ml-4">
                    <h5 className="font-semibold">Amanda Lee</h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Team Lead, DesignHub</p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  "We've tried many project management tools, but WorkSphere stands out with its balance of simplicity
                  and powerful features. It's become essential to our workflow."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-violet-600 dark:bg-violet-800">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-3xl font-bold mb-6 text-white">Ready to transform how your team works?</h3>
            <p className="text-lg text-violet-100 mb-8 max-w-2xl mx-auto">
              Join thousands of teams already using WorkSphere to collaborate more effectively and deliver projects on
              time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="px-8 py-6 text-lg font-medium">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-lg font-medium bg-transparent text-white border-white hover:bg-white/10"
                >
                  Schedule Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center text-white font-bold">
                  W
                </div>
                <h1 className="text-xl font-bold text-white">WorkSphere</h1>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Empowering teams to work better together with secure, collaborative project management.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Product</h5>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Resources</h5>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Guides
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Company</h5>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Legal
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} WorkSphere. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
