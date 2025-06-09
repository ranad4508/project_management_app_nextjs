export const appConfig = {
  name: "WorkSphere",
  version: "1.0.0",
  description: "A powerful project management platform for teams",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  api: {
    version: "v1",
    prefix: "/api",
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
}
