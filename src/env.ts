import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    WEBSUMMIT_EVENT: z.string().default("lis26"),
    WEBSUMMIT_DATA_DIR: z.string().optional(),
    WEBSUMMIT_TOKEN: z.string().optional(),
    WEBSUMMIT_ENABLE_SOCIAL: z.string().optional(),
    WEBSUMMIT_RPS: z.coerce.number().min(1).max(4).default(2),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
