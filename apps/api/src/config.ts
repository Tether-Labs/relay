import "./load-env.js";
import { z } from "zod";
import { isResendEnabled } from "./lib/resend-config.js";

const configSchema = z.object({
  port: z.coerce.number().default(3847),
  apiUrl: z.string().url().default("http://localhost:3847"),
  webUrl: z.string().url().default("http://localhost:5173"),
  databaseUrl: z.string().default("./data/relay.db"),
  storageDir: z.string().default("./storage"),
  sessionSecret: z.string().min(8).default("dev-secret-change-me"),
  cookieDomain: z.string().optional(),
  corsOrigins: z.array(z.string().url()).default([]),
  hideFooter: z.coerce.boolean().default(false),
  resendApiKey: z.string().optional(),
  emailFrom: z.string().default("Relay <onboarding@resend.dev>"),
  clerkSecretKey: z.string().optional(),
  /** Log magic links to terminal (default on when RESEND_API_KEY unset) */
  logMagicLinks: z.coerce.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;

let cached: Config | null = null;

function parseOrigins(value: string | undefined): string[] {
  return value?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
}

export function getConfig(): Config {
  if (!cached) {
    cached = configSchema.parse({
      port: process.env.PORT,
      apiUrl: process.env.API_URL ?? process.env.BASE_URL,
      webUrl: process.env.WEB_URL,
      databaseUrl: process.env.DATABASE_URL,
      storageDir: process.env.STORAGE_DIR,
      sessionSecret: process.env.SESSION_SECRET,
      cookieDomain: process.env.COOKIE_DOMAIN,
      corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
      hideFooter: process.env.RELAY_HIDE_FOOTER === "1",
      resendApiKey: process.env.RESEND_API_KEY,
      emailFrom: process.env.EMAIL_FROM,
      clerkSecretKey: process.env.CLERK_SECRET_KEY,
      logMagicLinks:
        process.env.LOG_MAGIC_LINKS === "0"
          ? false
          : process.env.LOG_MAGIC_LINKS === "1" || !isResendEnabled(process.env.RESEND_API_KEY),
    });
  }
  return cached;
}
