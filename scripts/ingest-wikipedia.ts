/**
 * Wikipedia Data Ingestion Script
 * Processes Wikipedia dataset and uploads to Cloudflare Workers
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface WikipediaArticle {
  title: string;
  content: string;
  metadata?: {
    categories?: string[];
    url?: string;
    [key: string]: any;
  };
}

interface IngestionConfig {
  workerUrl: string;
  dataDirectory: string;
  batchSize?: number;
}

/**
 * Main ingestion function
 */
async function ingestWikipediaDataset(config: IngestionConfig): Promise<void> {
  const { workerUrl, dataDirectory, batchSize = 5 } = config;

  console.log('Starting Wikipedia data ingestion...');
  console.log(`Worker URL: ${workerUrl}`);
  console.log(`Data directory: ${dataDirectory}`);

  // Read all JSON files from data directory
  const files = await fs.readdir(dataDirectory);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} articles to ingest`);

  let successCount = 0;
  let failCount = 0;

  // Process in batches
  for (let i = 0; i < jsonFiles.length; i += batchSize) {
    const batch = jsonFiles.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}...`);

    const promises = batch.map(async (file) => {
      try {
        // Read article
        const filePath = path.join(dataDirectory, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const article: WikipediaArticle = JSON.parse(content);

        // Send to worker
        const response = await fetch(`${workerUrl}/api/v1/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(article),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        console.log(`✓ Ingested: ${article.title} (Workflow: ${result.data.workflowId})`);
        return true;
      } catch (error) {
        console.error(`✗ Failed: ${file}`, error instanceof Error ? error.message : error);
        return false;
      }
    });

    const results = await Promise.all(promises);
    successCount += results.filter((r) => r).length;
    failCount += results.filter((r) => !r).length;

    // Wait a bit between batches to avoid overloading
    if (i + batchSize < jsonFiles.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log('\n=== Ingestion Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${jsonFiles.length}`);
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run ingest <data-directory> [worker-url]');
    console.error('Example: npm run ingest ./data/wikipedia http://localhost:8787');
    process.exit(1);
  }

  const dataDirectory = args[0];
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
