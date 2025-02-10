import Database from "better-sqlite3";
import { unlink } from "fs/promises";

const DB_FILE = "test-content.db";

async function createTestDb() {
  try {
    // Delete existing database if it exists
    try {
      await unlink(DB_FILE);
    } catch (e) {
      // Ignore if file doesn't exist
    }

    // Create new database
    const db = new Database(DB_FILE);

    // Create FTS5 table
    db.exec(`
      CREATE VIRTUAL TABLE search_documents USING fts5(
        title, 
        content, 
        tokenize='porter unicode61'
      );
    `);

    // Test content
    const docs = [
      {
        title: "TypeScript Guide",
        content: "A comprehensive guide to TypeScript programming language",
      },
      {
        title: "JavaScript Basics",
        content: "Learn the basics of JavaScript web programming",
      },
      {
        title: "Programming Languages",
        content: "TypeScript is a superset of JavaScript",
      },
      {
        title: "Web Development",
        content: "Modern web development with JavaScript and TypeScript",
      },
    ];

    // Insert documents
    const insert = db.prepare(
      "INSERT INTO search_documents (title, content) VALUES (?, ?)"
    );
    docs.forEach((doc) => {
      insert.run(doc.title, doc.content);
    });

    // Run some test queries to verify the setup
    const testQueries = [
      "programming",
      '"programming"',
      '"programming language"',
      "programming NOT javascript",
      '"programming" NOT "javascript"',
      'programming NOT "javascript" NOT "python"',
      '"programming" NOT "javascript" NOT "python"',
    ];

    console.log("Running test queries:\n");
    testQueries.forEach((query) => {
      console.log(`Query: ${query}`);
      const results = db
        .prepare(
          "SELECT *, rank FROM search_documents WHERE search_documents MATCH ? ORDER BY rank"
        )
        .all(query);
      console.log("Results:", results.length);
      results.forEach((r: any) =>
        console.log(`- ${r.title}: ${r.content} (rank: ${r.rank})`)
      );
      console.log();
    });

    // Print table content for verification
    console.log("\nAll documents in the database:");
    const allDocs = db.prepare("SELECT * FROM search_documents").all();
    allDocs.forEach((doc: any) => {
      console.log(`- ${doc.title}: ${doc.content}`);
    });

    db.close();
    console.log(`\nTest database created at ${DB_FILE}`);
  } catch (error) {
    console.error("Error creating test database:", error);
    process.exit(1);
  }
}

createTestDb();
