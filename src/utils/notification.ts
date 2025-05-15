import axios from "axios"
import fs from "fs"
import path from "path"
import os from "os"
import { createLogger } from "./logger"

const logger = createLogger("notification")
const CONFIG_FILE = path.join(os.homedir(), ".db-backup-config.json")

export async function sendNotification(options: { subject: string; message: string }): Promise<void> {
  try {
    // Load config
    let config = {}
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"))
    }

    const slackWebhookUrl = config["slackWebhookUrl"]

    if (!slackWebhookUrl) {
      logger.warn("Slack webhook URL not configured. Skipping notification.")
      return
    }

    // Send notification to Slack
    await axios.post(slackWebhookUrl, {
      text: `*${options.subject}*\n${options.message}`,
    })

    logger.info("Notification sent successfully", {
      subject: options.subject,
    })
  } catch (error) {
    logger.error(`Failed to send notification: ${error.message}`, {
      error: error.stack,
    })
  }
}
