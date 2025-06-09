# WorkSphere - Project Management Platform

A powerful, full-stack project management platform built with Next.js, MongoDB, and modern web technologies. WorkSphere provides teams with comprehensive tools for project management, task tracking, team collaboration, and secure communication.

## 🚀 Features

### Core Features
- **User Authentication & Authorization**
  - JWT-based authentication
  - Multi-factor authentication (MFA)
  - Email verification
  - Password reset functionality
  - Role-based access control

- **Workspace Management**
  - Create and manage multiple workspaces
  - Invite team members with different roles
  - Workspace settings and permissions
  - Member management

- **Project Management**
  - Create and organize projects within workspaces
  - Project status tracking
  - Member assignment
  - Project analytics and reporting

- **Task Management**
  - Create, assign, and track tasks
  - Multiple task statuses and priorities
  - Due date management
  - Task comments and attachments
  - Activity tracking

- **Team Collaboration**
  - Real-time chat with end-to-end encryption
  - File sharing and attachments
  - @mentions and notifications
  - Team activity feeds

- **Security Features**
  - End-to-end encryption for chat messages
  - Secure file uploads
  - Rate limiting
  - CORS protection
  - Input validation and sanitization

## 🛠 Tech Stack

### Backend
- **Framework**: Next.js 14 (App Router)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with JWT
- **Email**: Brevo (Sendinblue) SMTP
- **Encryption**: Node.js Crypto API
- **Validation**: Zod
- **File Upload**: Vercel Blob (planned)

### Frontend
- **Framework**: Next.js 14 with React 18
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Animations**: Framer Motion
- **State Management**: React Context + Hooks
- **Forms**: React Hook Form + Zod

### Development
- **Language**: TypeScript
- **Linting**: ESLint
- **Code Formatting**: Prettier
- **Testing**: Jest + React Testing Library (planned)

## 📁 Project Structure

\`\`\`
worksphere/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts
│   │   ├── email.ts
│   │   ├── auth.ts
│   │   └── app.ts
│   ├── controllers/      # API controllers
│   │   ├── auth.controller.ts
│   │   ├── workspace.controller.ts
│   │   └── project.controller.ts
│   ├── services/         # Business logic services
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   └── workspace.service.ts
│   ├── models/           # Database models
│   │   ├── user.ts
│   │   ├── workspace.ts
│   │   ├── project.ts
│   │   ├── task.ts
│   │   └── chat.ts
│   ├── middleware/       # Custom middleware
│   │   ├── auth.middleware.ts
│   │   └── validation.middleware.ts
│   ├── types/            # TypeScript type definitions
│   │   ├── auth.types.ts
│   │   ├── workspace.types.ts
│   │   └── api.types.ts
│   ├── enums/            # Enumerations
│   │   ├── user.enum.ts
│   │   ├── task.enum.ts
│   │   └── notification.enum.ts
│   ├── utils/            # Utility functions
│   │   ├── crypto.utils.ts
│   │   ├── date.utils.ts
│   │   └── string.utils.ts
│   └── errors/           # Error handling
│       ├── AppError.ts
│       └── errorHandler.ts
├── app/                  # Next.js app directory
│   ├── api/              # API routes
│   ├── (auth)/           # Authentication pages
│   ├── dashboard/        # Dashboard pages
│   └── globals.css
├── components/           # React components
│   ├── ui/               # shadcn/ui components
│   └── custom/           # Custom components
└── lib/                  # Shared utilities
\`\`\`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Brevo (Sendinblue) account for email services

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/worksphere.git
   cd worksphere
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Fill in your environment variables:
   \`\`\`env
   # Database
   MONGODB_URI=mongodb://localhost:27017/worksphere
   
   # Authentication
   NEXTAUTH_SECRET=your-nextauth-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   
   # Email Configuration (Brevo)
   BREVO_SMTP_HOST=smtp-relay.brevo.com
   BREVO_SMTP_PORT=587
   BREVO_SMTP_USER=your-brevo-smtp-user
   BREVO_SMTP_PASSWORD=your-brevo-smtp-password
   EMAIL_FROM=noreply@worksphere.com
   
   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   \`\`\`

4. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📧 Email Configuration

WorkSphere uses Brevo (formerly Sendinblue) for email services. To set up email functionality:

1. Create a Brevo account at [brevo.com](https://brevo.com)
2. Generate SMTP credentials in your Brevo dashboard
3. Add the credentials to your `.env.local` file
4. Configure your sender email address

## 🔐 Security Features

### Authentication
- JWT-based session management
- Multi-factor authentication support
- Secure password hashing with bcrypt
- Email verification for new accounts

### Data Protection
- End-to-end encryption for chat messages using AES-256-GCM
- Diffie-Hellman key exchange for secure communication
- Input validation and sanitization
- CORS protection

### Rate Limiting
- API rate limiting to prevent abuse
- Configurable limits per endpoint
- IP-based tracking

## 🧪 Testing

\`\`\`bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment
\`\`\`bash
# Build the application
npm run build

# Start production server
npm start
\`\`\`

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/mfa/enable` - Enable MFA
- `POST /api/auth/mfa/verify` - Verify MFA code
- `POST /api/auth/mfa/disable` - Disable MFA

### Workspace Endpoints
- `GET /api/workspaces` - Get user workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/[id]` - Get workspace details
- `PUT /api/workspaces/[id]` - Update workspace
- `DELETE /api/workspaces/[id]` - Delete workspace
- `POST /api/workspaces/[id]/members` - Invite member
- `GET /api/workspaces/[id]/members` - Get workspace members

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- [MongoDB](https://mongodb.com/) for the database
- [Brevo](https://brevo.com/) for email services

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact us at support@worksphere.com
- Check our documentation at [docs.worksphere.com](https://docs.worksphere.com)

---

**WorkSphere** - Empowering teams to work better together 🚀
