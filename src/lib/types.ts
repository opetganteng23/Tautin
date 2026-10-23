import { ObjectId } from "mongodb";

export interface User {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  username: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  emailVerified: boolean;
  planId: ObjectId | null;
  planExpiresAt: Date | null;
  trialUsed: boolean;
  createdAt: Date;
  verifyTokenHash?: string;
  verifyTokenExpires?: Date;
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  reminded7For?: Date;
  reminded1For?: Date;
}

export interface Plan {
  _id: ObjectId;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxLinks: number;
  analyticsLevel: "none" | "basic" | "full";
  /** id tema yang boleh dipakai; "*" = semua. Tema non-premium selalu boleh. */
  allowedThemes: string[];
  removeBranding: boolean;
  trialDays: number;
  isActive: boolean;
  isFree: boolean;
}

/** Tema = konfigurasi JSON, bukan template kode. */
export interface ThemeConfig {
  bgType: "solid" | "gradient" | "3d";
  bg1: string;
  bg2: string;
  text: string;
  buttonBg: string;
  buttonText: string;
  buttonRadius: number;
  buttonStyle: "solid" | "outline" | "3d";
  font: "poppins" | "serif" | "mono" | "system";
  tilt: boolean;
}

export interface Theme {
  _id: ObjectId;
  name: string;
  config: ThemeConfig;
  isPremium: boolean;
}

export interface Profile {
  _id: ObjectId;
  userId: ObjectId;
  displayName: string;
  bio: string;
  avatarUrl: string;
  themeId: ObjectId | null;
  themeOverrides: Partial<ThemeConfig>;
  customDomain: string | null;
}

export interface LinkDoc {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
  type: "link" | "header" | "social";
  clickCount: number;
  disabledByPlan?: boolean;
}

export interface Order {
  _id: ObjectId;
  userId: ObjectId;
  planId: ObjectId;
  planName: string;
  period: "monthly" | "yearly";
  amount: number;
  midtransOrderId: string;
  snapToken?: string;
  status: "pending" | "settlement" | "expire" | "cancel";
  paymentType?: string;
  paidAt?: Date;
  processed: boolean;
  createdAt: Date;
}

export interface Settings {
  freeModeGlobal: boolean;
  reservedUsernames: string[];
  gracePeriodDays: number;
}
