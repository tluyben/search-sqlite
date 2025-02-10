# 🔍 Search SQLite

A TypeScript library for creating a full-text search index on a SQLite database and performing advanced searches with ranking and filtering.

## 🌟 Features

- 📂 Create a full-text search index on a SQLite table
- 📝 Add documents to the index
- 🔎 Perform keyword searches with ranking
- 💬 Support for quoted phrases and negative modifiers
- 🚀 Efficient and lightweight

## 📦 Installation

```bash
npm install search-sqlite
```

## 🚀 Usage

```typescript
import { SearchEngine } from 'search-sqlite';

// Create a new search engine instance
const searchEngine = new SearchEngine('data.db', {
  columns: ['title', 'content'] // Columns to index
});

// Add documents to the index
searchEngine.addDocument({ title: 'TypeScript Guide', content: 'Learn TypeScript' });
searchEngine.addDocument({ title: 'JavaScript Basics', content: 'Intro to JavaScript' });

// Perform a search
const results = searchEngine.search('typescript');
console.log(results);
/*
[
  { title: 'TypeScript Guide', content: 'Learn TypeScript' }
]
*/
```

## 🔍 Advanced Search

The `search` method supports advanced search features:

- **Keyword Search**: `searchEngine.search('typescript')`
- **Phrase Search**: `searchEngine.search('"programming language"')`
- **Negative Modifiers**: `searchEngine.search('typescript -javascript')`
- **Combined Search**: `searchEngine.search('typescript "web dev" -basics')`

## 🔧 Configuration

You can customize the table name and prefix used for the FTS5 table:

```typescript
const searchEngine = new SearchEngine('data.db', {
  tableName: 'articles', // Custom table name 
  prefix: 'idx_', // Custom prefix
  columns: ['title', 'body']
});
```

The `prefix` option can also be set via an environment variable `SEARCH_PREFIX`.

## 🧪 Testing

This project includes a comprehensive test suite covering various scenarios. To run the tests:

```bash
npm test
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).
