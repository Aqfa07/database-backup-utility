import type { DatabaseConnector } from "./index"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { createLogger } from "../utils/logger"

const logger = createLogger("mysql-connector")

export class MySQLConnector implements DatabaseConnector {
  private config: any

  async connect(config: any): Promise<void> {
    this.config = config
    logger.info(`Connecting to MySQL database: ${config.database}`, {
      host: config.host,
      port: config.port,
      database: config.database,
    })
  }

  async disconnect(): Promise<void> {
    logger.info("Disconnected from MySQL database")
  }

  async testConnection(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const mysqlTest = spawn("mysql", [
        "-h",
        this.config.host,
        "-P",
        this.config.port || "3306",
        "-u",
        this.config.user,
        `-p${this.config.password}`,
        "-e",
        "SELECT 1",
      ])

      let errorOutput = ""

      mysqlTest.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      mysqlTest.on("close", (code) => {
        if (code === 0) {
          resolve(true)
        } else {
          reject(new Error(`Connection test failed: ${errorOutput}`))
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

      const args = [
        "-h",
        this.config.host,
        "-P",
        this.config.port || "3306",
        "-u",
        this.config.user,
        `-p${this.config.password}`,
        "--single-transaction",
        "--routines",
        "--triggers",
        "--events",
      ]

      // Add options based on backup type
      if (backupType === "incremental" || backupType === "differential") {
        // For MySQL, true incremental backups require binary logs
        // This is a simplified version that just backs up data
        args.push("--no-create-info")
      } else {
        // Full backup
        args.push("--add-drop-database")
        args.push("--databases", this.config.database)
      }

      const mysqldump = spawn("mysqldump", args)

      // Pipe output to file
      const outputStream = fs.createWriteStream(outputPath)
      mysqldump.stdout.pipe(outputStream)

      let errorOutput = ""

      mysqldump.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      mysqldump.on("close", (code) => {
        outputStream.end()
        if (code === 0) {
          logger.info(`MySQL backup completed: ${outputPath}`, {
            outputPath,
            backupType,
          })
          resolve(outputPath)
        } else {
          reject(new Error(`mysqldump failed with code ${code}: ${errorOutput}`))
        }
      })
    })
  }

  async restore(options: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const inputPath = options.inputPath
      const selectiveTables = options.selectiveTables

      const args = [
        "-h",
        this.config.host,
        "-P",
        this.config.port || "3306",
        "-u",
        this.config.user,
        `-p${this.config.password}`,
        this.config.database,
      ]

      // For selective restore, we need to filter the SQL file
      // This is a simplified approach - a more robust solution would parse the SQL
      if (selectiveTables && selectiveTables.length > 0) {
        // Create a temporary filtered SQL file
        const tempFile = `${inputPath}.filtered.sql`
        const content = fs.readFileSync(inputPath, "utf8")

        let filteredContent = ""
        let includeLines = true

        // Very simple filtering - in a real implementation, use a proper SQL parser
        const lines = content.split("\n")
        for (const line of lines) {
          if (line.startsWith("CREATE TABLE") || line.startsWith("INSERT INTO")) {
            const tableName = line.match(/`([^`]+)`/)?.[1]
            includeLines = tableName ? selectiveTables.includes(tableName) : false
          }

          if (includeLines) {
            filteredContent += line + "\n"
          }
        }

        fs.writeFileSync(tempFile, filteredContent)

        // Use the filtered file for restore
        const mysql = spawn("mysql", args)
        const inputStream = fs.createReadStream(tempFile)
        inputStream.pipe(mysql.stdin)

        let errorOutput = ""

        mysql.stderr.on("data", (data) => {
          errorOutput += data.toString()
        })

        mysql.on("close", (code) => {
          // Clean up temp file
          fs.unlinkSync(tempFile)

          if (code === 0) {
            logger.info(`MySQL selective restore completed from: ${inputPath}`, {
              inputPath,
              selectiveTables,
            })
            resolve()
          } else {
            reject(new Error(`mysql restore failed with code ${code}: ${errorOutput}`))
          }
        })
      } else {
        // Standard restore
        const mysql = spawn("mysql", args)
        const inputStream = fs.createReadStream(inputPath)
        inputStream.pipe(mysql.stdin)

        let errorOutput = ""

        mysql.stderr.on("data", (data) => {
          errorOutput += data.toString()
        })

        mysql.on("close", (code) => {
          if (code === 0) {
            logger.info(`MySQL restore completed from: ${inputPath}`, {
              inputPath,
            })
            resolve()
          } else {
            reject(new Error(`mysql restore failed with code ${code}: ${errorOutput}`))
          }
        })
      }
    })
  }

  getFileExtension(): string {
    return "sql"
  }
}
