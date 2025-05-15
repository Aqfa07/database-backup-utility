import { getStorageProvider } from "../storage"
import { createLogger } from "../utils/logger"
import Table from "cli-table3"

const logger = createLogger("list")

export async function listBackups(options: any) {
  logger.info(`Listing backups from ${options.storage}`, {
    storageType: options.storage,
    outputPath: options.output,
  })

  try {
    // Get the storage provider
    const storageProvider = getStorageProvider(options.storage)
    await storageProvider.initialize({
      key: options.cloudKey,
      secret: options.cloudSecret,
      bucket: options.cloudBucket,
      region: options.cloudRegion,
      basePath: options.output,
    })

    // List backups
    const backups = await storageProvider.list()

    if (backups.length === 0) {
      console.log("No backups found.")
      return
    }

    // Create a table for display
    const table = new Table({
      head: ["Filename", "Size", "Date", "Type"],
      colWidths: [50, 15, 25, 15],
    })

    // Add each backup to the table
    backups.forEach((backup) => {
      table.push([
        backup.name,
        formatSize(backup.size),
        new Date(backup.lastModified).toLocaleString(),
        getBackupType(backup.name),
      ])
    })

    // Display the table
    console.log(table.toString())
  } catch (error) {
    logger.error(`Failed to list backups: ${error.message}`, {
      error: error.stack,
    })

    console.error(`Failed to list backups: ${error.message}`)
    process.exit(1)
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function getBackupType(filename: string): string {
  if (filename.includes("_full_")) return "Full"
  if (filename.includes("_incremental_")) return "Incremental"
  if (filename.includes("_differential_")) return "Differential"
  return "Unknown"
}
