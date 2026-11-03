import { z } from "zod";
import type { Api } from "../api/api.js";
import type { Company } from "../domain.js";

export const searchCompaniesSchema = z.object({
  query: z.string().optional(),
  industry: z.string().optional(),
  limit: z.number().min(1).max(50).default(25),
});

export async function searchCompanies(api: Api, args: z.input<typeof searchCompaniesSchema>) {
  const parsed = searchCompaniesSchema.parse(args);
  return api.searchCompanies(parsed.query ?? "", parsed.limit);
}

export const getCompanySchema = z.object({ id: z.string() });

export async function getCompany(api: Api, args: z.infer<typeof getCompanySchema>) {
  return api.getCompany(args.id);
}
