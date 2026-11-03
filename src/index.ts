import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ZodError, ZodSchema } from "zod";
import { AttendeeClient } from "./api/client.js";
import { Api } from "./api/api.js";
import * as sessionsT from "./tools/sessions.js";
import * as speakersT from "./tools/speakers.js";
import * as attendeesT from "./tools/attendees.js";
import * as companiesT from "./tools/companies.js";
import * as scheduleT from "./tools/schedule.js";
import * as authT from "./tools/auth.js";
import * as socialT from "./tools/social.js";
import { env } from "./env.js";

const client = new AttendeeClient();
const api = new Api(client);

interface ToolDef<TSchema extends ZodSchema = ZodSchema> {
  name: string;
  description: string;
  schema: TSchema;
  inputSchema: unknown;
  readOnlyHint?: boolean;
  handler: (args: unknown) => Promise<unknown>;
}

function tool<TSchema extends ZodSchema, TOut = unknown>(
  name: string,
  description: string,
  schema: TSchema,
  handler: (args: TSchema["_input"]) => Promise<TOut>,
  opts: { readOnlyHint?: boolean } = {}
): ToolDef<TSchema> {
  return { 
    name, 
    description, 
    schema, 
    inputSchema: zodToJsonSchema(schema), 
    ...opts, 
    handler: (args: unknown) => handler(schema.parse(args) as TSchema["_input"]) 
  };
}

const tools: ToolDef[] = [
  tool("auth_status", "Check whether the user is signed in to the Web Summit attendee app. Returns masked email and event; never returns the token.", authT.authStatusSchema, async () => authT.authStatus()),
  tool("auth_start", "Start sign-in: send a one-time code to the user's email.", authT.authStartSchema, async (a) => authT.authStart(a)),
  tool("auth_verify", "Verify the one-time code the user received by email.", authT.authVerifySchema, async (a) => authT.authVerify(a)),
  tool("auth_logout", "Delete stored credentials.", authT.authLogoutSchema, async () => authT.authLogout()),

  tool("search_sessions", "Search sessions at the event. Filter by query, day, track, speaker, time window.", sessionsT.searchSessionsSchema, async (a) => sessionsT.searchSessions(api, a), { readOnlyHint: true }),
  tool("get_session", "Get full details of one session including description and speakers.", sessionsT.getSessionSchema, async (a) => sessionsT.getSession(api, a), { readOnlyHint: true }),

  tool("search_speakers", "Search speakers / attendees.", speakersT.searchSpeakersSchema, async (a) => speakersT.searchSpeakers(api, a), { readOnlyHint: true }),
  tool("get_speaker", "Get one speaker profile.", speakersT.getSpeakerSchema, async (a) => speakersT.getSpeaker(api, a), { readOnlyHint: true }),

  tool("search_attendees", "Search the attendee directory (max 25 results).", attendeesT.searchAttendeesSchema, async (a) => attendeesT.searchAttendees(api, a), { readOnlyHint: true }),
  tool("get_attendee", "Get one attendee profile.", attendeesT.getAttendeeSchema, async (a) => attendeesT.getAttendee(api, a), { readOnlyHint: true }),

  tool("search_companies", "Search companies, startups and exhibitors.", companiesT.searchCompaniesSchema, async (a) => companiesT.searchCompanies(api, a), { readOnlyHint: true }),
  tool("get_company", "Get one company profile.", companiesT.getCompanySchema, async (a) => companiesT.getCompany(api, a), { readOnlyHint: true }),

  tool("my_schedule", "The user's bookmarked sessions in time order, with clash detection.", scheduleT.myScheduleSchema, async () => scheduleT.mySchedule(api), { readOnlyHint: true }),
  tool("schedule_add", "Bookmark a session (reversible, visible only to the user).", scheduleT.scheduleAddSchema, async (a) => scheduleT.scheduleAdd(api, a)),
  tool("schedule_remove", "Remove a bookmark.", scheduleT.scheduleRemoveSchema, async (a) => scheduleT.scheduleRemove(api, a)),
  tool("free_slots", "Find free time slots in the user's schedule.", scheduleT.freeSlotsSchema, async (a) => scheduleT.freeSlotsTool(api, a), { readOnlyHint: true }),
  tool("export_ics", "Export the user's schedule as an .ics file.", scheduleT.exportIcsSchema, async () => scheduleT.exportIcsTool(), { readOnlyHint: true }),
];

if (env.WEBSUMMIT_ENABLE_SOCIAL === "1") {
  tools.push(
    tool("list_connections", "List the user's connections.", socialT.listConnectionsSchema, async () => socialT.listConnections(api), { readOnlyHint: true }),
    tool("list_meetings", "List the user's meetings.", socialT.listMeetingsSchema, async () => socialT.listMeetings(api), { readOnlyHint: true }),
    tool("send_connection_request", "Send a connection request. Requires confirm=true to actually send; otherwise returns a preview.", socialT.sendConnectionRequestSchema, async (a) => socialT.sendConnectionRequest(api, a as { to: string; message?: string; confirm?: boolean })),
    tool("request_meeting", "Request a meeting with another attendee. Requires confirm=true to actually send; otherwise returns a preview.", socialT.requestMeetingSchema, async (a) => socialT.requestMeeting(api, a as { to: string; message?: string; duration?: number; confirm?: boolean })),
  );
}

const server = new Server(
  { name: "websummit-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      ...(t.readOnlyHint ? { annotations: { readOnlyHint: true } } : {}),
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const t = tools.find((x) => x.name === request.params.name);
  if (!t) {
    return { content: [{ type: "text", text: JSON.stringify({ error: `unknown tool: ${request.params.name}` }) }] };
  }
  try {
    const parsed = t.schema.parse(request.params.arguments ?? {});
    const result = await t.handler(parsed);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (err: unknown) {
    let msg: string;
    if (err instanceof ZodError) {
      msg = "invalid arguments: " + err.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    } else if (err instanceof Error) {
      msg = err.message;
    } else {
      msg = String(err);
    }
    return { content: [{ type: "text", text: JSON.stringify({ error: msg }) }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
