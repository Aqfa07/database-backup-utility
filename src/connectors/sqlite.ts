import type { DatabaseConnector } from "./index"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { createLogger } from "../utils/logger"

const logger = createLogger("sqlite-connector")

export class SQLiteConnector implements DatabaseConnector {
  private config: any

  async connect(config: any): Promise<void> {
    this.config = config
    // For SQLite, the database is the file path
    logger.info(`Connecting to SQLite database: ${config.database}`, {
      database: config.database,
    })

    // Check if the database file exists
    if (!fs.existsSync(this.config.database)) {
      throw new Error(`SQLite database file not found: ${this.config.database}`)
    }
  }

  async disconnect(): Promise<void> {
    logger.info("Disconnected from SQLite database")
  }

  async testConnection(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const sqliteTest = spawn("sqlite3", [this.config.database, ".tables"])

      let errorOutput = ""

      sqliteTest.stderr.on("data", (data) => {
        errorOutput += data.toString()
      })

      sqliteTest.on("close", (code) => {
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

      // SQLite doesn't have incremental/differential backups
      if (backupType !== "full") {
        logger.warn(`SQLite doesn't support ${backupType} backups. Performing full backup instead.`)
      }

      // For SQLite, we can simply copy the database file
      try {
        fs.copyFileSync(this.config.database, outputPath)
        logger.info(`SQLite backup completed: ${outputPath}`, {
          outputPath,
          backupType: "full",
        })
        resolve(outputPath)
      } catch (error) {
        reject(new Error(`SQLite backup failed: ${error.message}`))
      }
    })
  }

  async restore(options: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const inputPath = options.inputPath
      const selectiveTables = options.selectiveTables

      // For selective restore, we need to use the sqlite3 command
      if (selectiveTables && selectiveTables.length > 0) {
        // Create a temporary database
        const tempDb = `${this.config.database}.temp`

        try {
          // Copy the backup to the temp database
          fs.copyFileSync(inputPath, tempDb)

          // Create commands to attach the temp database and copy selected tables
          let commands = `.open ${this.config.database}\n`
          commands += `.attach '${tempDb}' as backup\n`

          // For each table, drop existing and copy from backup
          for (const table of selectiveTables) {
            commands += `DROP TABLE IF EXISTS ${table};\n`
            commands += `CREATE TABLE ${table} AS SELECT * FROM backup.${table};\n`
          }

          commands += `.quit\n`

          // Write commands to a temp file
          const commandFile = `${tempDb}.sql`
          fs.writeFileSync(commandFile, commands)

          // Execute the commands
          const sqlite = spawn("sqlite3", ["-init", commandFile, this.config.database])

          let errorOutput = ""

          sqlite.stderr.on("data", (data) => {
            errorOutput += data.toString()
          })

          sqlite.on("close", (code) => {
            // Clean up temp files
            fs.unlinkSync(tempDb)
            fs.unlinkSync(commandFile)

            if (code === 0) {
              logger.info(`SQLite selective restore completed from: ${inputPath}`, {
                inputPath,
                selectiveTables,
              })
              resolve()
            } else {
              reject(new Error(`SQLite restore failed with code ${code}: ${errorOutput}`))
            }
          })

          // End the input
          sqlite.stdin.end()
        } catch (error) {
          reject(new Error(`SQLite selective restore failed: ${error.message}`))
        }
      } else {
        // For full restore, simply replace the database file
        try {
          // Make sure the target directory exists
          const dbDir = path.dirname(this.config.database)
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true })
          }

          // Copy the backup over the existing database
          fs.copyFileSync(inputPath, this.config.database)

          logger.info(`SQLite restore completed from: ${inputPath}`, {
            inputPath,
          })
          resolve()
        } catch (error) {
          reject(new Error(`SQLite restore failed: ${error.message}`))
        }
      }
    })
  }

  getFileExtension(): string {
    return "db"
  }
}
