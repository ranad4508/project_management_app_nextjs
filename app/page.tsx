import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle,
  Users,
  Calendar,
  Shield,
  Sparkles,
  Zap,
  Globe,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg">
                W
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-violet-600 to-indigo-700 bg-clip-text text-transparent">
              WorkSphere
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <nav className="hidden md:flex gap-8 mr-6">
              <Link
                href="#features"
                className="text-gray-700 hover:text-violet-600 transition-all duration-300 font-medium relative group"
              >
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-violet-600 transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </nav>
            <Link href="/login">
              <Button
                variant="outline"
                className="font-semibold border-2 hover:border-violet-600 hover:text-violet-600 transition-all duration-300"
              >
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Sign Up
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-40 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50"></div>
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-4000"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-indigo-100 border border-violet-200 rounded-full px-6 py-3 mb-8 shadow-sm">
                <Zap className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">
                  New: Task Automation Software
                </span>
              </div>

              <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight">
                Manage Work{" "}
                <span className="relative">
                  <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Effortlessly
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-3 bg-gradient-to-r from-violet-200 to-indigo-200 rounded-full opacity-30"></div>
                </span>
              </h2>

              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                WorkSphere helps teams plan, track, and manage work efficiently
                with powerful collaboration tools and{" "}
                <span className="font-semibold text-violet-600">
                  end-to-end security
                </span>
                .
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="px-10 py-7 text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 rounded-2xl"
                  >
                    Get Started Free
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-10 py-7 text-xl font-bold border-2 border-gray-300 hover:border-violet-600 hover:text-violet-600 transition-all duration-300 rounded-2xl bg-white/80 backdrop-blur-sm"
                  >
                    View Demo
                    <Globe className="ml-3 h-6 w-6" />
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg">
                  <div className="text-3xl font-black text-violet-600 mb-2">
                    50K+
                  </div>
                  <div className="text-gray-600 font-medium">Active Teams</div>
                </div>
                <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg">
                  <div className="text-3xl font-black text-indigo-600 mb-2">
                    2M+
                  </div>
                  <div className="text-gray-600 font-medium">
                    Tasks Completed
                  </div>
                </div>
                <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-violet-100 shadow-lg">
                  <div className="text-3xl font-black text-purple-600 mb-2">
                    99.9%
                  </div>
                  <div className="text-gray-600 font-medium">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-100 to-indigo-100 border border-violet-200 rounded-full px-6 py-3 mb-6">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">
                  Powerful Features
                </span>
              </div>
              <h3 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Why Choose WorkSphere?
              </h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Our comprehensive platform provides everything you need to
                manage projects and collaborate with your team seamlessly.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="group p-8 bg-gradient-to-br from-white to-violet-50 border-2 border-violet-100 rounded-3xl hover:shadow-2xl hover:border-violet-200 transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-2xl font-bold mb-4 text-gray-900">
                  Task Management
                </h4>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Create, assign, and track tasks with customizable workflows.
                  Set priorities, due dates, and monitor progress in real-time
                  with AI insights.
                </p>
              </div>

              <div className="group p-8 bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-100 rounded-3xl hover:shadow-2xl hover:border-indigo-200 transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-2xl font-bold mb-4 text-gray-900">
                  Team Collaboration
                </h4>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Chat securely with team members and share resources in
                  real-time. End-to-end encryption ensures your communications
                  stay private and secure.
                </p>
              </div>

              <div className="group p-8 bg-gradient-to-br from-white to-purple-50 border-2 border-purple-100 rounded-3xl hover:shadow-2xl hover:border-purple-200 transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-2xl font-bold mb-4 text-gray-900">
                  Project Planning
                </h4>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Organize projects with customizable workspaces. Set
                  milestones, track deadlines, and visualize project timelines
                  with interactive Gantt charts.
                </p>
              </div>

              <div className="group p-8 bg-gradient-to-br from-white to-green-50 border-2 border-green-100 rounded-3xl hover:shadow-2xl hover:border-green-200 transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-2xl font-bold mb-4 text-gray-900">
                  Advanced Security
                </h4>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Multi-factor authentication, role-based access control, and
                  end-to-end encrypted chat keep your data secure with
                  enterprise-grade protection.
                </p>
              </div>

              <div className="group p-8 bg-gradient-to-br from-white to-orange-50 border-2 border-orange-100 rounded-3xl hover:shadow-2xl hover:border-orange-200 transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
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
                <h4 className="text-2xl font-bold mb-4 text-gray-900">
                  Detailed Analytics
                </h4>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Track project progress, team performance, and resource
                  allocation with comprehensive dashboards, reports, and
                  predictive analytics.
                </p>
              </div>

              <div className="group p-8 bg-gradient-to-br from-white to-blue-50 border-2 border-blue-100 rounded-3xl hover:shadow-2xl hover:border-blue-200 transition-all duration-500 transform hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white"
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
                <h4 className="text-2xl font-bold mb-4 text-gray-900">
                  Smart Notifications
                </h4>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Stay updated with customizable notifications for task
                  assignments, comments, mentions, and approaching deadlines. AI
                  learns your preferences.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800"></div>
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-20 left-20 w-40 h-40 bg-white rounded-full opacity-5 animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-60 h-60 bg-white rounded-full opacity-5 animate-pulse animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white rounded-full opacity-5 animate-pulse animation-delay-4000"></div>
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <h3 className="text-4xl md:text-5xl font-black mb-8 text-white leading-tight">
              Ready to transform how your team works?
            </h3>
            <p className="text-xl text-violet-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of teams already using WorkSphere to collaborate
              more effectively and deliver projects on time. Start your free
              trial today!
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="px-10 py-7 text-xl font-bold bg-white text-violet-700 hover:bg-gray-50 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 rounded-2xl"
                >
                  Start Free Trial
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-10 py-7 text-xl font-bold bg-transparent text-white border-2 border-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 rounded-2xl"
                >
                  Schedule Demo
                  <Calendar className="ml-3 h-6 w-6" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center text-white font-black shadow-lg">
                  W
                </div>
                <h1 className="text-2xl font-black text-white">WorkSphere</h1>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Empowering teams to work better together with secure,
                collaborative project management solutions.
              </p>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-violet-600 transition-all duration-300"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-violet-600 transition-all duration-300"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-violet-600 transition-all duration-300"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
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
              <h5 className="font-bold text-white mb-6 text-lg">Product</h5>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#features"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Security
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white mb-6 text-lg">Resources</h5>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Guides
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    API Reference
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white mb-6 text-lg">Company</h5>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Legal
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-16 pt-8 text-center text-gray-400">
            <p className="text-lg">
              © {new Date().getFullYear()} WorkSphere. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
