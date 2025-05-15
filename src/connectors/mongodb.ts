import type { DatabaseConnector } from "./index"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { createLogger } from "../utils/logger"

const logger = createLogger("mongodb-connector")

export class MongoDBConnector implements DatabaseConnector {
  private config: any

  async connect(config: any): Promise<void> {
    this.config = config
    logger.info(`Connecting to MongoDB database: ${config.database}`, {
      host: config.host,
      port: config.port,
      database: config.database,
    })
  }

  async disconnect(): Promise<void> {
    logger.info("Disconnected from MongoDB database")
  }

  async testConnection(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const connectionString = this.buildConnectionString()

      const mongoTest = spawn("mongosh", [connectionString, "--eval", "db.runCommand({ ping: 1 })"])

      let output = ""
      let errorOutput = ""

      mongoTest.stdout.on("data", (data) => {
        output += data.toString()
      })

      mongoTest.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      mongoTest.on("close", (code) => {
        if (code === 0 && output.includes("ok: 1")) {
          resolve(true)
        } else {
          reject(new Error(`Connection test failed: ${errorOutput || output}`))
        }
      })
    })
  }

  async backup(options: any): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const outputPath = options.outputPath
      const backupType = options.backupType || "full"

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputPath)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      const connectionString = this.buildConnectionString()

      const args = ["--uri", connectionString, "--out", outputPath, "--gzip"]

      // MongoDB doesn't have built-in incremental/differential backups
      // For production, consider using MongoDB Ops Manager or Atlas
      if (backupType !== "full") {
        logger.warn(`MongoDB doesn't support ${backupType} backups natively. Performing full backup instead.`)
      }

      const mongodump = spawn("mongodump", args)

      let errorOutput = ""

      mongodump.stderr.on("data", (data) => {
        const msg = data.toString()
        if (msg.includes("ERROR")) {
          errorOutput += msg
        }
      })

      mongodump.on("close", (code) => {
        if (code === 0) {
          logger.info(`MongoDB backup completed: ${outputPath}`, {
            outputPath,
            backupType,
          })
          resolve(outputPath)
        } else {
          reject(new Error(`mongodump failed with code ${code}: ${errorOutput}`))
        }
      })
    })
  }

  async restore(options: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const inputPath = options.inputPath
      const selectiveTables = options.selectiveTables

      const connectionString = this.buildConnectionString()

      const args = ["--uri", connectionString, "--gzip"]

      // Add selective restore options if specified
      if (selectiveTables && selectiveTables.length > 0) {
        selectiveTables.forEach((collection) => {
          args.push("--nsInclude", `${this.config.database}.${collection}`)
        })
      }

      args.push("--dir", inputPath)

      const mongorestore = spawn("mongorestore", args)

      let errorOutput = ""

      mongorestore.stderr.on("data", (data) => {
        const msg = data.toString()
        if (msg.includes("ERROR")) {
          errorOutput += msg
        }
      })

      mongorestore.on("close", (code) => {
        if (code === 0) {
          logger.info(`MongoDB restore completed from: ${inputPath}`, {
            inputPath,
            selectiveTables,
          })
          resolve()
        } else {
          reject(new Error(`mongorestore failed with code ${code}: ${errorOutput}`))
        }
      })
    })
  }

  getFileExtension(): string {
    return "archive"
  }

  private buildConnectionString(): string {
    const auth =
      this.config.user && this.config.password
        ? `${encodeURIComponent(this.config.user)}:${encodeURIComponent(this.config.password)}@`
        : ""

    return `mongodb://${auth}${this.config.host}:${this.config.port || "27017"}/${this.config.database}`
  }
}
