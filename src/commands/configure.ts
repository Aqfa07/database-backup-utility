import inquirer from "inquirer"
import fs from "fs"
import path from "path"
import os from "os"
import { createLogger } from "../utils/logger"

const logger = createLogger("configure")
const CONFIG_FILE = path.join(os.homedir(), ".db-backup-config.json")

export async function configureSettings() {
  // Load existing config if it exists
  let config = {}
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"))
  }

  // Ask questions
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "defaultDbType",
      message: "Select default database type:",
      choices: ["mysql", "postgres", "mongodb", "sqlite"],
      default: config.defaultDbType || "postgres",
    },
    {
      type: "input",
      name: "defaultHost",
      message: "Default database host:",
      default: config.defaultHost || "localhost",
    },
    {
      type: "input",
      name: "defaultUser",
      message: "Default database username:",
      default: config.defaultUser || "",
    },
    {
      type: "password",
      name: "defaultPassword",
      message: "Default database password:",
      default: config.defaultPassword || "",
    },
    {
      type: "list",
      name: "defaultStorage",
      message: "Select default storage type:",
      choices: ["local", "s3", "gcs", "azure"],
      default: config.defaultStorage || "local",
    },
    {
      type: "input",
      name: "defaultOutputPath",
      message: "Default backup output path:",
      default: config.defaultOutputPath || "./backups",
    },
    {
      type: "confirm",
      name: "defaultCompress",
      message: "Compress backups by default?",
      default: config.defaultCompress || false,
    },
    {
      type: "input",
      name: "slackWebhookUrl",
      message: "Slack webhook URL for notifications (leave empty to skip):",
      default: config.slackWebhookUrl || "",
    },
  ])

  // Save config
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(answers, null, 2))

  logger.info("Configuration saved", { configPath: CONFIG_FILE })

  console.log(`Configuration saved to ${CONFIG_FILE}`)
}
