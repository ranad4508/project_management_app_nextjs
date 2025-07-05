---
<h1 align="center">🚀 WorkSphere</h1>

<p align="center">
A modern, secure, and scalable project management platform built with <strong>Next.js 14</strong>, <strong>TypeScript</strong>, and <strong>MongoDB</strong>.
</p>

<p align="center">
<a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14-000000?logo=next.js" /></a>
<a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-4.9.5-3178C6?logo=typescript" /></a>
<a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-6.0-47A248?logo=mongodb" /></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" /></a>
<a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
</p>
---

## 📌 Overview

WorkSphere streamlines team collaboration, task management, and communication in a single unified platform. Empower your teams with real-time chat, role-based access, and advanced project-tracking tools.

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [⚙️ Setup](#-setup)
- [📧 Email Configuration](#-email-configuration)
- [🔐 Security Features](#-security-features)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [💬 Support](#-support)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

---

## ✨ Features

### 🔐 Authentication & Authorization

- JWT-based sessions
- Multi-factor authentication (MFA)
- Email verification & password resets
- Role-based access control

### 🏢 Workspace Management

- Create & manage multiple workspaces
- Role-based team invitations & permissions

### 📦 Project Management

- Track project status & member assignment
- View analytics & reporting

### ✅ Task Management

- Assign tasks with priorities, deadlines, comments, attachments
- Track activity history

### 💬 Team Collaboration

- Real-time encrypted chat
- @mentions, file sharing, team feeds

### 🛡️ Security

- End-to-end encryption (AES-256-GCM + Diffie-Hellman)
- Rate limiting, CORS protection, input sanitization

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, MongoDB, NextAuth.js
- **Utilities**: TypeScript, ESLint, Prettier
- **Testing**: Jest, React Testing Library

---

## 📁 Project Structure

```
worksphere/
├── app/                 # Next.js App Router directory
│   ├── api/             # API route handlers
│   ├── (auth)/          # Authentication routes
│   ├── dashboard/       # Dashboard UI pages
├── components/
│   ├── ui/              # shadcn/ui components
│   └── custom/          # Custom components
├── src/
│   ├── config/          # App & service configs
│   ├── controllers/     # API logic
│   ├── services/        # Business logic
│   ├── models/          # Mongoose models
│   ├── middleware/      # Custom middleware
│   ├── types/           # TypeScript definitions
│   ├── enums/           # Enumerated values
│   ├── utils/           # Helper functions
│   └── errors/          # Error handling
└── lib/                 # Shared library functions
```

---

## ⚙️ Setup

### Prerequisites

- Node.js 18+
- MongoDB instance
- Brevo (Sendinblue) account for emails

### Installation

```bash
git clone https://github.com/your-username/worksphere.git
cd worksphere
npm install
cp .env.example .env.local
```

Fill in `.env.local` with:

```env
MONGODB_URI=mongodb://localhost:27017/worksphere
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Brevo Email
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your-user
BREVO_SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@worksphere.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Start development server:

```bash
npm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## 📧 Email Configuration

1. Register at [Brevo](https://brevo.com)
2. Generate SMTP credentials
3. Update `.env.local` accordingly
4. Set up sender domain/email

---

## 🔐 Security Features

- **Authentication**: MFA, bcrypt, email verification
- **Encryption**: AES-256-GCM chat, secure file sharing
- **Protection**: Rate limiting, CORS, input validation

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Code coverage
npm run test:coverage
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to [Vercel](https://vercel.com/)
3. Configure environment variables
4. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

---

## 🤝 Contributing

We welcome your contributions!

```bash
# Fork and clone
git checkout -b feature/your-feature
git commit -m "Add: Your feature"
git push origin feature/your-feature
```

Please ensure:

- Code follows conventions
- Add tests where needed
- Update docs
- Tests pass

---

## 💬 Support

- 📚 [Documentation](https://docs.worksphere.com)
- 🐛 [GitHub Issues](https://github.com/your-username/worksphere/issues)
- 📧 Email: [support@worksphere.com](mailto:support@worksphere.com)
- 💬 [Join Discord](https://discord.gg/worksphere)

---

## 📄 License

MIT License. See [`LICENSE`](LICENSE) for full details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [MongoDB](https://mongodb.com/)
- [Brevo](https://brevo.com/)

---

<p align="center"><strong>WorkSphere</strong> — Empowering teams to work better together.</p>
<p align="center">
  <a href="https://twitter.com/worksphere">
    <img src="https://img.shields.io/twitter/follow/worksphere?style=social" />
  </a>
  <a href="https://discord.gg/worksphere">
    <img src="https://img.shields.io/discord/1234567890?label=discord&logo=discord&logoColor=white" />
  </a>
</p>

---
