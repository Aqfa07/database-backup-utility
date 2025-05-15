import winston from "winston"
import path from "path"
import fs from "fs"

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs")
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Define log format
const logFormat = winston.format.combine(winston.format.timestamp(), winston.format.json())

// Create the logger factory
export function createLogger(module: string) {
  return winston.createLogger({
    level: "info",
    format: logFormat,
    defaultMeta: { module },
    transports: [
      // Write all logs to console
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
      // Write all logs to appropriate files
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
      }),
      new winston.transports.File({
        filename: path.join(logsDir, "combined.log"),
      }),
      new winston.transports.File({
        filename: path.join(logsDir, `${module}.log`),
      }),
    ],
  })
}
