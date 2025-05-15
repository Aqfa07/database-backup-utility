import { schedule } from "node-schedule"
import { backupDatabase } from "./backup"
import { createLogger } from "../utils/logger"
import fs from "fs"
import path from "path"
import os from "os"

const logger = createLogger("scheduler")
const SCHEDULE_FILE = path.join(os.homedir(), ".db-backup-schedules.json")

export async function scheduleBackup(options: any) {
  // Load existing schedules
  let schedules = []
  if (fs.existsSync(SCHEDULE_FILE)) {
    schedules = JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf8"))
  }

  // Create a new schedule
  const scheduleId = Date.now().toString()
  const newSchedule = {
    id: scheduleId,
    cron: options.cron,
    options: { ...options },
  }

  // Add to schedules
  schedules.push(newSchedule)

  // Save schedules
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedules, null, 2))

  // Schedule the job
  schedule.scheduleJob(scheduleId, options.cron, () => {
    logger.info(`Running scheduled backup: ${scheduleId}`, {
      scheduleId,
      databaseType: options.type,
      databaseName: options.database,
    })

    backupDatabase(options).catch((error) => {
      logger.error(`Scheduled backup failed: ${error.message}`, {
        scheduleId,
        error: error.stack,
      })
    })
  })

  logger.info(`Backup scheduled with cron: ${options.cron}`, {
    scheduleId,
    cron: options.cron,
    databaseType: options.type,
    databaseName: options.database,
  })

  console.log(`Backup scheduled with ID: ${scheduleId}`)
  console.log(`Cron expression: ${options.cron}`)
  console.log(`Database: ${options.database} (${options.type})`)
  console.log(`To cancel this schedule, run: db-backup cancel-schedule ${scheduleId}`)
}
