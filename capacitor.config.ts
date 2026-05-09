import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.frost.appmoneymanagement",
  appName: "MoneyManagement",
  webDir: "dist",
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      iosIsEncryption: false,
      iosKeychainPrefix: "com.frost.appmoneymanagement",
      androidIsEncryption: false
    }
  }
};

export default config;
