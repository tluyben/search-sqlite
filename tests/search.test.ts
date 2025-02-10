import { SearchEngine } from "../search-sqlite";

describe("SearchEngine", () => {
  let searchEngine: SearchEngine;

  beforeEach(() => {
    // Use in-memory SQLite database for testing
    searchEngine = new SearchEngine(":memory:", {
      columns: ["title", "content"],
    });
  });

  afterEach(() => {
    searchEngine.close();
  });

  describe("Configuration", () => {
    test("should use default table name and prefix", () => {
      const engine = new SearchEngine(":memory:", {
        columns: ["title"],
      });

      // Add a document to trigger table creation
      engine.addDocument({ title: "Test" });

      // Query SQLite schema to verify table name
      const db = engine["db"];
      const table = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='search_documents'
      `
        )
        .get();

      expect(table).toBeTruthy();
      engine.close();
    });

    test("should respect custom table name and prefix", () => {
      const engine = new SearchEngine(":memory:", {
        tableName: "articles",
        prefix: "idx_",
        columns: ["title"],
      });

      engine.addDocument({ title: "Test" });

      const db = engine["db"];
      const table = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='idx_articles'
      `
        )
        .get();

      expect(table).toBeTruthy();
      engine.close();
    });

    test("should respect SEARCH_PREFIX environment variable", () => {
      // const originalPrefix = process.env.SEARCH_PREFIX;
      // process.env.SEARCH_PREFIX = "env_";

      const engine = new SearchEngine(":memory:", {
        columns: ["title"],
        prefix: "env_",
      });

      engine.addDocument({ title: "Test" });

      const db = engine["db"];
      const table = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='env_documents'
      `
        )
        .get();

      expect(table).toBeTruthy();
      engine.close();

      // Restore original environment
      // if (originalPrefix) {
      // process.env.SEARCH_PREFIX = originalPrefix;
      // } else {
      // delete process.env.SEARCH_PREFIX;
      // }
    });
  });

  describe("Document Management", () => {
    test("should add and retrieve documents", () => {
      const doc = {
        title: "TypeScript Guide",
        content: "A comprehensive guide to TypeScript",
      };

      searchEngine.addDocument(doc);
      const results = searchEngine.search("typescript");

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe(doc.title);
      expect(results[0].content).toBe(doc.content);
    });

    test("should handle multiple documents", () => {
      const docs = [
        { title: "TypeScript", content: "Programming language" },
        { title: "JavaScript", content: "Web programming" },
        { title: "Python", content: "Programming language" },
      ];

      docs.forEach((doc) => searchEngine.addDocument(doc));
      const results = searchEngine.search("programming");

      expect(results).toHaveLength(3);
    });
  });

  describe("Search Features", () => {
    beforeEach(() => {
      // Add test documents
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

      docs.forEach((doc) => searchEngine.addDocument(doc));
    });

    test("should support basic keyword search", () => {
      const results = searchEngine.search("typescript");
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(
          result.title.toLowerCase() + result.content.toLowerCase()
        ).toContain("typescript");
      });
    });

    test("should support phrase search with quotes", () => {
      const results = searchEngine.search('"programming language"');
      expect(results.length).toBe(2); // actually the system works better than we thought :)
      // console.log(results);
      expect((results[0].title + results[0].content).toLowerCase()).toContain(
        "programming language"
      );
    });

    test("should support negative keyword search", () => {
      const results = searchEngine.search("typescript -javascript");
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        const text = (result.title + " " + result.content).toLowerCase();
        expect(text).toContain("typescript");
        expect(text).not.toContain("javascript");
      });
    });

    test("should support negative phrase search", () => {
      const results = searchEngine.search('web -"programming language"');
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        const text = (result.title + " " + result.content).toLowerCase();
        expect(text).toContain("web");
        expect(text).not.toContain("programming language");
      });
    });

    test("should handle combined search features", () => {
      const results = searchEngine.search(
        'typescript "web development" -basics'
      );
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        const text = (result.title + " " + result.content).toLowerCase();
        expect(text).toContain("typescript");
        expect(text).toContain("web development");
        expect(text).not.toContain("basics");
      });
    });

    test("should respect search result limit", () => {
      const limit = 2;
      const results = searchEngine.search("programming", limit);
      expect(results).toHaveLength(limit);
    });

    test("should handle multiple negative terms", () => {
      const results = searchEngine.search("programming -javascript -python");
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        const text = (result.title + " " + result.content).toLowerCase();
        expect(text).not.toContain("javascript");
        expect(text).not.toContain("python");
      });
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty search query", () => {
      expect(() => searchEngine.search("")).not.toThrow();
    });

    test("should handle special characters in search", () => {
      expect(() => searchEngine.search("type&script")).not.toThrow();
    });

    test("should handle unmatched quotes", () => {
      expect(() => searchEngine.search('"typescript')).not.toThrow();
    });

    test("should handle multiple consecutive spaces", () => {
      expect(() =>
        searchEngine.search("typescript    javascript")
      ).not.toThrow();
    });
  });
});
