import Database from "better-sqlite3";

interface SearchConfig {
  tableName?: string;
  columns: string[];
  prefix?: string;
}

const DEFAULT_TABLE_NAME = "documents";
const DEFAULT_PREFIX = process.env.SEARCH_PREFIX || "search_";

export class SearchEngine {
  private db: Database.Database;
  private config: SearchConfig;

  constructor(dbPath: string, config: SearchConfig) {
    this.db = new Database(dbPath);
    this.config = {
      ...config,
      tableName: config.tableName || DEFAULT_TABLE_NAME,
      prefix: config.prefix || DEFAULT_PREFIX,
    };
    this.initialize();
  }

  private initialize() {
    // Create FTS5 virtual table with prefix
    const columnDefs = this.config.columns.join(", ");
    const tableName = `${this.config.prefix}${this.config.tableName}`;
    // console.log("tableName", tableName, process.env.SEARCH_PREFIX);
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} 
      USING fts5(${columnDefs}, tokenize='porter unicode61');
    `);
  }

  public addDocument(document: Record<string, string>) {
    const columns = this.config.columns.join(", ");
    const placeholders = this.config.columns.map(() => "?").join(", ");

    const stmt = this.db.prepare(`
      INSERT INTO ${this.config.prefix}${this.config.tableName} (${columns})
      VALUES (${placeholders})
    `);

    const values = this.config.columns.map((col) => document[col]);
    stmt.run(values);
  }

  private parseQuery(query: string): string {
    if (query.trim() === "") {
      return "*";
    }
    const terms: string[] = [];
    let currentTerm = "";
    let inQuotes = false;

    // Split the query into terms, handling quotes and negative modifiers
    for (let i = 0; i < query.length; i++) {
      const char = query[i];

      if (char === '"') {
        if (inQuotes) {
          // End of quoted phrase
          terms.push(`"${currentTerm}"`);
          currentTerm = "";
        }
        inQuotes = !inQuotes;
      } else if (
        char === "-" &&
        !inQuotes &&
        (i === 0 || query[i - 1] === " ")
      ) {
        // Negative modifier at start of term
        currentTerm = "-";
      } else if (char === " " && !inQuotes) {
        // Space outside quotes - end of term
        if (currentTerm) {
          terms.push(currentTerm);
          currentTerm = "";
        }
      } else {
        currentTerm += char;
      }
    }

    // Add final term if exists
    if (currentTerm) {
      terms.push(currentTerm);
    }

    let fullQuery = "";

    for (let term of terms) {
      // sugar:
      if (term.startsWith('"-')) {
        term = '-"' + term.substring(2);
      }

      const negative = term.startsWith("-");
      if (negative) {
        term = term.substring(1);
      }

      // if there are any special characters in the term, wrap it in quotes
      if (!term.startsWith('"')) {
        // && term.match(/[^a-zA-Z0-9\"]/)) {
        term = `"${term}"`;
      }

      // if (fullQuery.length > 0) {
      //   fullQuery += "AND ";
      // }
      if (negative) {
        fullQuery += `NOT ${term} `;
      } else {
        fullQuery += `${term} `;
      }
    }

    fullQuery = fullQuery.trim();
    // console.log("fullQuery", fullQuery);
    return fullQuery;
  }

  public search(query: string, limit: number = 10): any[] {
    if (query.trim() === "") {
      return [];
    }

    const parsedQuery = this.parseQuery(query);
    const sql = `
      SELECT * FROM ${this.config.prefix}${this.config.tableName}
      WHERE ${this.config.prefix}${this.config.tableName} MATCH ?
      ORDER BY rank
      LIMIT ?
    `;

    const stmt = this.db.prepare(sql);

    // const allDocs = this.db.prepare("SELECT * FROM search_documents").all();
    // console.log(allDocs);
    // allDocs.forEach((doc: any) => {
    //   console.log(`- ${doc.title}: ${doc.content} ${allDocs.length}`);
    // });

    try {
      return stmt.all(parsedQuery, limit);
    } catch (e: any) {
      if (e instanceof Database.SqliteError) {
        // console.log(`SQLite error: ${e.message}`);
        throw new Error(`Invalid search query: ${query}`);
      } else {
        throw e;
      }
    }
  }

  public close() {
    this.db.close();
  }
}
