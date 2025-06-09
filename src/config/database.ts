import mongoose from "mongoose"

interface DatabaseConfig {
  uri: string
  options: mongoose.ConnectOptions
}

const config: DatabaseConfig = {
  uri: process.env.MONGODB_URI || "",
  options: {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
  },
}

class Database {
  private static instance: Database
  private isConnected = false

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return
    }

    try {
      await mongoose.connect(config.uri, config.options)
      this.isConnected = true
      console.log("✅ Database connected successfully")
    } catch (error) {
      console.error("❌ Database connection failed:", error)
      throw error
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await mongoose.disconnect()
      this.isConnected = false
      console.log("✅ Database disconnected successfully")
    } catch (error) {
      console.error("❌ Database disconnection failed:", error)
      throw error
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected
  }
}

export default Database.getInstance()
