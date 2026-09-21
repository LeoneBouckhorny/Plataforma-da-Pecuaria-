const AccountRepository = ((LocalDatabaseRef, PropertyCoreRef) => {
  const LocalDatabase = LocalDatabaseRef || (typeof require === "function"
    ? require("./local-database.js")
    : null);
  const PropertyCore = PropertyCoreRef || (typeof require === "function"
    ? require("./property-core.js")
    : null);

  if (!LocalDatabase || !PropertyCore) {
    throw new Error("Dependências da operação local indisponíveis.");
  }

  const ACTIVE_ACCOUNT_SETTING_KEY = "active-account-id";

  class Repository {
    constructor(options = {}) {
      this.database = options.database || LocalDatabase.createLocalDatabase(options);
      this.idFactory = options.idFactory;
      this.now = options.now;
    }

    options() {
      return {
        idFactory: this.idFactory,
        now: this.now,
      };
    }

    async getActiveAccountId() {
      const setting = await this.database.get(LocalDatabase.APP_SETTINGS_STORE, ACTIVE_ACCOUNT_SETTING_KEY);
      return setting && setting.value ? String(setting.value) : "";
    }

    async setActiveAccountId(accountId) {
      const record = { key: ACTIVE_ACCOUNT_SETTING_KEY, value: String(accountId || "") };
      await this.database.put(LocalDatabase.APP_SETTINGS_STORE, record);
      return record;
    }

    async getActiveAccount() {
      try {
        const accountId = await this.getActiveAccountId();
        if (!accountId) {
          return { status: "missing", account: null, error: null };
        }

        const account = await this.database.get(LocalDatabase.ACCOUNTS_STORE, accountId);
        return {
          status: account ? "loaded" : "missing",
          account: account ? PropertyCore.normalizeAccount(account) : null,
          error: null,
        };
      } catch (error) {
        return { status: "failed", account: null, error };
      }
    }

    async ensureLocalAccount() {
      try {
        const activeAccount = await this.getActiveAccount();
        if (activeAccount.status === "loaded") {
          return { status: "loaded", account: activeAccount.account, error: null };
        }

        const existingAccounts = await this.database.getAll(LocalDatabase.ACCOUNTS_STORE);
        const existingActive = existingAccounts
          .map((account) => PropertyCore.normalizeAccount(account))
          .find((account) => account.status === PropertyCore.ACTIVE_STATUS);

        if (existingActive) {
          await this.setActiveAccountId(existingActive.id);
          return { status: "loaded", account: existingActive, error: null };
        }

        const account = PropertyCore.normalizeAccount({}, this.options());
        await this.database.put(LocalDatabase.ACCOUNTS_STORE, account);
        await this.setActiveAccountId(account.id);
        return { status: "created", account, error: null };
      } catch (error) {
        return { status: "failed", account: null, error };
      }
    }

    async updateAccountName(name) {
      try {
        const activeAccount = await this.ensureLocalAccount();
        if (!activeAccount.account) {
          return { status: "failed", account: null, errors: {}, error: activeAccount.error };
        }

        const validation = PropertyCore.updateAccountName(activeAccount.account, name, this.options());
        if (!validation.valid) {
          return { status: "invalid", account: activeAccount.account, errors: validation.errors, error: null };
        }

        await this.database.put(LocalDatabase.ACCOUNTS_STORE, validation.account);
        return { status: "saved", account: validation.account, errors: {}, error: null };
      } catch (error) {
        return { status: "failed", account: null, errors: {}, error };
      }
    }

    close() {
      this.database.close();
    }
  }

  function createAccountRepository(options = {}) {
    return new Repository(options);
  }

  return {
    ACTIVE_ACCOUNT_SETTING_KEY,
    Repository,
    createAccountRepository,
  };
})(
  typeof window !== "undefined" ? window.LocalDatabase : undefined,
  typeof window !== "undefined" ? window.PropertyCore : undefined,
);

if (typeof module !== "undefined") {
  module.exports = AccountRepository;
}

if (typeof window !== "undefined") {
  window.AccountRepository = AccountRepository;
}
