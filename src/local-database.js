const LocalDatabase = (() => {
  const DB_NAME = "plataforma-pecuaria";
  const DB_VERSION = 2;
  const DRAFT_STORE = "drafts";
  const WEIGHING_SESSIONS_STORE = "weighing-sessions";
  const WEIGHING_ITEMS_STORE = "weighing-items";
  const SESSION_ID_INDEX = "sessionId";

  class LocalDatabaseError extends Error {
    constructor(message, cause) {
      super(message);
      this.name = "LocalDatabaseError";
      this.cause = cause;
    }
  }

  function getIndexedDB(options = {}) {
    if (options.indexedDB !== undefined) {
      return options.indexedDB;
    }

    if (typeof globalThis !== "undefined" && globalThis.indexedDB) {
      return globalThis.indexedDB;
    }

    return null;
  }

  function runMigrations(db, oldVersion, transaction) {
    if (oldVersion < 1 && !db.objectStoreNames.contains(DRAFT_STORE)) {
      db.createObjectStore(DRAFT_STORE, { keyPath: "key" });
    }

    if (oldVersion < 2) {
      if (!db.objectStoreNames.contains(WEIGHING_SESSIONS_STORE)) {
        db.createObjectStore(WEIGHING_SESSIONS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(WEIGHING_ITEMS_STORE)) {
        const itemStore = db.createObjectStore(WEIGHING_ITEMS_STORE, { keyPath: "id" });
        itemStore.createIndex(SESSION_ID_INDEX, "sessionId", { unique: false });
      } else if (transaction) {
        const itemStore = transaction.objectStore(WEIGHING_ITEMS_STORE);
        if (!itemStore.indexNames.contains(SESSION_ID_INDEX)) {
          itemStore.createIndex(SESSION_ID_INDEX, "sessionId", { unique: false });
        }
      }
    }
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new LocalDatabaseError("Falha em operação do IndexedDB.", request.error));
    });
  }

  function transactionToPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new LocalDatabaseError("Falha na transação do IndexedDB.", transaction.error));
      transaction.onabort = () => reject(new LocalDatabaseError("Transação do IndexedDB abortada.", transaction.error));
    });
  }

  function deleteByIndex(store, indexName, key) {
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.only(key);
      const request = store.index(indexName).openCursor(range);
      let deleted = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(deleted);
          return;
        }

        cursor.delete();
        deleted += 1;
        cursor.continue();
      };

      request.onerror = () => {
        reject(new LocalDatabaseError("Falha ao excluir registros por índice.", request.error));
      };
    });
  }

  class Database {
    constructor(options = {}) {
      this.indexedDB = getIndexedDB(options);
      this.name = options.name || DB_NAME;
      this.version = options.version || DB_VERSION;
      this.db = null;
      this.openPromise = null;
    }

    open() {
      if (this.db) {
        return Promise.resolve(this.db);
      }

      if (this.openPromise) {
        return this.openPromise;
      }

      if (!this.indexedDB) {
        return Promise.reject(new LocalDatabaseError("IndexedDB indisponível neste navegador."));
      }

      this.openPromise = new Promise((resolve, reject) => {
        const request = this.indexedDB.open(this.name, this.version);

        request.onupgradeneeded = (event) => {
          runMigrations(request.result, event.oldVersion, request.transaction);
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.db.onversionchange = () => this.close();
          resolve(this.db);
        };

        request.onerror = () => {
          reject(new LocalDatabaseError("Não foi possível abrir o banco local.", request.error));
        };

        request.onblocked = () => {
          reject(new LocalDatabaseError("A abertura do banco local foi bloqueada por outra aba."));
        };
      });

      return this.openPromise;
    }

    async get(storeName, key) {
      const db = await this.open();
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      return requestToPromise(store.get(key));
    }

    async put(storeName, value) {
      const db = await this.open();
      const transaction = db.transaction(storeName, "readwrite");
      const transactionDone = transactionToPromise(transaction);
      const store = transaction.objectStore(storeName);
      await requestToPromise(store.put(value));
      await transactionDone;
      return value;
    }

    async delete(storeName, key) {
      const db = await this.open();
      const transaction = db.transaction(storeName, "readwrite");
      const transactionDone = transactionToPromise(transaction);
      const store = transaction.objectStore(storeName);
      await requestToPromise(store.delete(key));
      await transactionDone;
    }

    async getAll(storeName) {
      const db = await this.open();
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      return requestToPromise(store.getAll());
    }

    async getAllByIndex(storeName, indexName, key) {
      const db = await this.open();
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      return requestToPromise(store.index(indexName).getAll(key));
    }

    async writeTransaction(storeNames, operation) {
      const db = await this.open();
      const transaction = db.transaction(storeNames, "readwrite");
      const transactionDone = transactionToPromise(transaction);
      const helpers = {
        store: (storeName) => transaction.objectStore(storeName),
        requestToPromise,
        deleteByIndex,
      };
      const result = await operation(helpers);
      await transactionDone;
      return result;
    }

    close() {
      if (this.db) {
        this.db.close();
        this.db = null;
        this.openPromise = null;
      }
    }
  }

  function createLocalDatabase(options = {}) {
    return new Database(options);
  }

  return {
    DB_NAME,
    DB_VERSION,
    DRAFT_STORE,
    WEIGHING_SESSIONS_STORE,
    WEIGHING_ITEMS_STORE,
    SESSION_ID_INDEX,
    LocalDatabaseError,
    Database,
    createLocalDatabase,
    runMigrations,
  };
})();

if (typeof module !== "undefined") {
  module.exports = LocalDatabase;
}

if (typeof window !== "undefined") {
  window.LocalDatabase = LocalDatabase;
}
