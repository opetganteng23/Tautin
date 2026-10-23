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
}
