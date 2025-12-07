#!/usr/bin/env node
/**
 * Wikipedia Data Ingestion Script (JavaScript)
 * Simpler version without TypeScript loader issues
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main ingestion function
 */
async function ingestWikipediaDataset(config) {
  const { workerUrl, dataDirectory, batchSize = 5 } = config;

  console.log('Starting Wikipedia data ingestion...');
  console.log(`Worker URL: ${workerUrl}`);
  console.log(`Data directory: ${dataDirectory}`);

  // Read all JSON files from data directory
  try {
    const files = await fs.readdir(dataDirectory);
    const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('_'));

    console.log(`Found ${jsonFiles.length} articles to ingest`);

    if (jsonFiles.length === 0) {
      console.warn('No JSON files found. Run: python scripts/fetch-wikipedia.py --size-mb 10');
      process.exit(1);
    }

    let successCount = 0;
    let failCount = 0;

    // Process in batches
    for (let i = 0; i < jsonFiles.length; i += batchSize) {
      const batch = jsonFiles.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jsonFiles.length / batchSize)}...`);

      const promises = batch.map(async (file) => {
        try {
          // Read article
          const filePath = path.join(dataDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const article = JSON.parse(content);

          // Send to worker
          const response = await fetch(`${workerUrl}/api/v1/ingest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(article),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP ${response.status}: ${error}`);
          }

          const result = await response.json();
          console.log(`  ✓ ${article.title}`);
          return { success: true, file };
        } catch (error) {
          console.error(`  ✗ ${file}: ${error.message}`);
          return { success: false, file };
        }
      });

      const results = await Promise.all(promises);
      successCount += results.filter((r) => r.success).length;
      failCount += results.filter((r) => !r.success).length;

      // Wait a bit between batches
      if (i + batchSize < jsonFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log('\n=== Ingestion Complete ===');
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Total: ${jsonFiles.length}`);

    if (failCount === 0) {
      console.log('\n✅ All articles ingested successfully!');
      process.exit(0);
    } else {
      console.warn(`\n⚠️  ${failCount} articles failed to ingest`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run ingest <data-directory>');
    console.error('Example: npm run ingest ./data/wikipedia');
    process.exit(1);
  }

  const dataDirectory = path.resolve(args[0]);
  const workerUrl = args[1] || 'http://localhost:8787';

  // Verify data directory exists
  try {
    await fs.access(dataDirectory);
  } catch (error) {
    console.error(`Error: Data directory not found: ${dataDirectory}`);
    process.exit(1);
  }

  await ingestWikipediaDataset({
    workerUrl,
    dataDirectory,
    batchSize: 5,
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
