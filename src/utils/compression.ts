import { createGzip, createGunzip } from "zlib"
import { createReadStream, createWriteStream } from "fs"
import { pipeline } from "stream/promises"
import path from "path"
import { createLogger } from "./logger"

const logger = createLogger("compression")

export async function compressFile(filePath: string): Promise<string> {
  const compressedPath = `${filePath}.gz`

  logger.info(`Compressing file: ${filePath} -> ${compressedPath}`)

  const source = createReadStream(filePath)
  const destination = createWriteStream(compressedPath)
  const gzip = createGzip()

  await pipeline(source, gzip, destination)

  logger.info(`Compression completed: ${compressedPath}`)

  return compressedPath
}

export async function decompressFile(filePath: string, outputDir: string): Promise<string> {
  let outputPath: string

  if (filePath.endsWith(".gz")) {
    outputPath = path.join(outputDir, path.basename(filePath, ".gz"))

    logger.info(`Decompressing gzip file: ${filePath} -> ${outputPath}`)

    const source = createReadStream(filePath)
    const destination = createWriteStream(outputPath)
    const gunzip = createGunzip()

    await pipeline(source, gunzip, destination)
  } else if (filePath.endsWith(".zip")) {
    // For zip files, use a library like 'adm-zip' or 'unzipper'
    // This is a simplified implementation
    const AdmZip = require("adm-zip")
    const zip = new AdmZip(filePath)

    // Extract all files to the output directory
    zip.extractAllTo(outputDir, true)

    // Assume the first file is the one we want
    const entries = zip.getEntries()
    if (entries.length === 0) {
      throw new Error("Zip file is empty")
    }

    outputPath = path.join(outputDir, entries[0].entryName)

    logger.info(`Decompressed zip file: ${filePath} -> ${outputPath}`)
  } else {
    // If the file is not compressed, just return the original path
    outputPath = filePath
  }

  logger.info(`Decompression completed: ${outputPath}`)

  return outputPath
}
