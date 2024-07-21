import path from "node:path";
import { z } from "zod";

import { buildDBClient, migrateDB, SqliteQueue } from "@hoarder/queue";

import serverConfig from "./config";

const QUEUE_DB_PATH = path.join(serverConfig.dataDir, "queue.db");

const queueDB = buildDBClient(QUEUE_DB_PATH);

export function runQueueDBMigrations() {
  migrateDB(queueDB);
}

// Link Crawler
export const zCrawlLinkRequestSchema = z.object({
  bookmarkId: z.string(),
  runInference: z.boolean().optional(),
});
export type ZCrawlLinkRequest = z.infer<typeof zCrawlLinkRequestSchema>;

export const LinkCrawlerQueue = new SqliteQueue<ZCrawlLinkRequest>(
  "link_crawler_queue",
  queueDB,
  {
    defaultJobArgs: {
      numRetries: 5,
    },
  },
);

// OpenAI Worker
export const zOpenAIRequestSchema = z.object({
  bookmarkId: z.string(),
});
export type ZOpenAIRequest = z.infer<typeof zOpenAIRequestSchema>;

export const OpenAIQueue = new SqliteQueue<ZOpenAIRequest>(
  "openai_queue",
  queueDB,
  {
    defaultJobArgs: {
      numRetries: 3,
    },
  },
);

// Search Indexing Worker
export const zSearchIndexingRequestSchema = z.object({
  bookmarkId: z.string(),
  type: z.enum(["index", "delete"]),
});
export type ZSearchIndexingRequest = z.infer<
  typeof zSearchIndexingRequestSchema
>;
export const SearchIndexingQueue = new SqliteQueue<ZSearchIndexingRequest>(
  "searching_indexing",
  queueDB,
  {
    defaultJobArgs: {
      numRetries: 5,
    },
  },
);

export function triggerSearchReindex(bookmarkId: string) {
  SearchIndexingQueue.enqueue({
    bookmarkId,
    type: "index",
  });
}

export function triggerSearchDeletion(bookmarkId: string) {
  SearchIndexingQueue.enqueue({
    bookmarkId: bookmarkId,
    type: "delete",
  });
}
