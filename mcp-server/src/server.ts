import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const server = new McpServer(
  {
    name: "sehatverse-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

const FUNCTION_BASE = process.env.SUPABASE_FUNCTION_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!FUNCTION_BASE || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing SUPABASE_FUNCTION_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

// Helper to call Supabase Edge Function
async function callFunction(path: string, body: any) {
  const res = await fetch(`${FUNCTION_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Supabase edge functions require apikey + Authorization
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Function ${path} failed: ${res.status} ${res.statusText} – ${text}`);
  }

  return json;
}

/**
 * 1) TRIAGE TOOL
 *    Wraps supabase/functions/triage-agent
 *    Input: symptoms + optional image/location
 */
server.tool(
  "triage",
  {
    symptoms: z.string().min(3),
    userId: z.string().min(1),
    conversationId: z.string().default("mcp-session"),
    userLocation: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        address: z.string().optional()
      })
      .optional(),
    imageBase64: z.string().optional()
  },
  async (args) => {
    const result = await callFunction("triage-agent", {
      symptoms: args.symptoms,
      userId: args.userId,
      conversationId: args.conversationId,
      userLocation: args.userLocation,
      imageBase64: args.imageBase64
    });

    return {
      content: [
        {
          type: "text",
          // LLM will read this and explain nicely to user
          text: JSON.stringify(result)
        }
      ]
    };
  }
);

/**
 * 2) PROGRAM ELIGIBILITY TOOL
 *    Wraps supabase/functions/eligibility-agent
 */
server.tool(
  "program_eligibility",
  {
    cnic: z.string().min(13).max(15), // 13 digits with dashes etc.
    userId: z.string().min(1),
    sessionId: z.string().default("mcp-session")
  },
  async (args) => {
    const result = await callFunction("eligibility-agent", {
      cnic: args.cnic,
      userId: args.userId,
      sessionId: args.sessionId
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result)
        }
      ]
    };
  }
);

/**
 * 3) FACILITY FINDER TOOL
 *    Wraps supabase/functions/facility-finder
 */
server.tool(
  "facility_finder",
  {
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    address: z.string().optional()
  },
  async (args) => {
    const result = await callFunction("facility-finder", {
      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result)
        }
      ]
    };
  }
);

/**
 * 4) FOLLOW-UP TOOL
 *    Wraps supabase/functions/followup-agent
 *    We keep params flexible; LLM can decide action.
 */
server.tool(
  "follow_up",
  {
    userId: z.string(),
    action: z.enum(["create", "update", "delete", "list"]),
    reminderType: z.string().optional(),
    medicationName: z.string().optional(),
    facilityName: z.string().optional(),
    doctorName: z.string().optional(),
    reminderTime: z.string().optional(),
    reminderId: z.string().optional(),
    frequency: z.string().optional(),
    customTimes: z.array(z.string()).optional(),
    phoneNumber: z.string().optional()
  },
  async (args) => {
    const result = await callFunction("followup-agent", args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result)
        }
      ]
    };
  }
);

// --- HTTP transport wrapper (so any client can call via /mcp) ---

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || "3333", 10);
app.listen(port, () => {
  console.log(`✅ SehatVerse MCP server running at http://localhost:${port}/mcp`);
});
