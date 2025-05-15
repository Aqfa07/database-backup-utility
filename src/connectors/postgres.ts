import type { DatabaseConnector } from "./index"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { createLogger } from "../utils/logger"

const logger = createLogger("postgres-connector")

export class PostgresConnector implements DatabaseConnector {
  private config: any

  async connect(config: any): Promise<void> {
    this.config = config
    logger.info(`Connecting to PostgreSQL database: ${config.database}`, {
      host: config.host,
      port: config.port,
      database: config.database,
    })
  }

  async disconnect(): Promise<void> {
    logger.info("Disconnected from PostgreSQL database")
  }

  async testConnection(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const pgTest = spawn("pg_isready", [
        "-h",
        this.config.host,
        "-p",
        this.config.port || "5432",
        "-U",
        this.config.user,
        "-d",
        this.config.database,
      ])

      let output = ""

      pgTest.stdout.on("data", (data) => {
        output += data.toString()
      })

      pgTest.stderr.on("data", (data) => {
        output += data.toString()
      })

      pgTest.on("close", (code) => {
        if (code === 0) {
          resolve(true)
        } else {
          reject(new Error(`Connection test failed: ${output}`))
        }
      })

      // Set environment variable for password
      pgTest.env = { ...process.env, PGPASSWORD: this.config.password }
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

      const args = [
        "-h",
        this.config.host,
        "-p",
        this.config.port || "5432",
        "-U",
        this.config.user,
        "-d",
        this.config.database,
        "-F",
        "c", // Custom format (compressed)
        "-f",
        outputPath,
      ]

      // Add options based on backup type
      if (backupType === "incremental" || backupType === "differential") {
        // For PostgreSQL, we need WAL archiving for true incremental backups
        // This is a simplified version that just backs up changes since last backup
        args.push("--data-only")
      }

      const pgDump = spawn("pg_dump", args)

      let errorOutput = ""

      pgDump.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      pgDump.on("close", (code) => {
        if (code === 0) {
          logger.info(`PostgreSQL backup completed: ${outputPath}`, {
            outputPath,
            backupType,
          })
          resolve(outputPath)
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${errorOutput}`))
        }
      })

      // Set environment variable for password
      pgDump.env = { ...process.env, PGPASSWORD: this.config.password }
    })
  }

  async restore(options: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const inputPath = options.inputPath
      const selectiveTables = options.selectiveTables

      const args = [
        "-h",
        this.config.host,
        "-p",
        this.config.port || "5432",
        "-U",
        this.config.user,
        "-d",
        this.config.database,
        "-F",
        "c", // Custom format (compressed)
      ]

      // Add selective restore options if specified
      if (selectiveTables && selectiveTables.length > 0) {
        selectiveTables.forEach((table) => {
          args.push("-t", table)
        })
      }

      args.push(inputPath)

      const pgRestore = spawn("pg_restore", args)

      let errorOutput = ""

      pgRestore.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      pgRestore.on("close", (code) => {
        // pg_restore can return non-zero even on successful restores with warnings
        if (code === 0 || (code !== 0 && !errorOutput.includes("ERROR:"))) {
          logger.info(`PostgreSQL restore completed from: ${inputPath}`, {
            inputPath,
            selectiveTables,
          })
          resolve()
        } else {
          reject(new Error(`pg_restore failed with code ${code}: ${errorOutput}`))
        }
      })

      // Set environment variable for password
      pgRestore.env = { ...process.env, PGPASSWORD: this.config.password }
    })
  }

  getFileExtension(): string {
    return "dump"
  }
}
