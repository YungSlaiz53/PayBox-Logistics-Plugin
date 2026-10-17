export const SOURCE_FILES: Record<string, { filename: string; language: string; content: string }> = {
  "src/plugin.ts": {
    filename: "src/plugin.ts",
    language: "typescript",
    content: `import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { encodeFunctionData, erc20Abi } from "viem";
import * as z from "zod/v4";
import {
  atomicAmount,
  evmOutputSchema,
  proposeEvm,
  proposeSolana,
  proposeX402,
  solanaOutputSchema,
  x402OutputSchema,
} from "./paybox.js";

const PROTOCOL_VERSION = "2026-07-28";
const USDC_BASE_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as \`0x\${string}\`;
const SOLANA_LOCKER_VAULT = "4Nd1mBQvEJd1KkHk3N4YdD4P8R8oQ3W9zZ2m2F8u5sQJ";

function createServer() {
  const server = new McpServer(
    { name: "paybox-local-logistics", version: "0.1.0" },
    { supportedProtocolVersions: [PROTOCOL_VERSION] },
  );

  // 1. Tool: quote_delivery (Read & calculate logistics route, ETA, and escrow fee quote)
  server.registerTool(
    "quote_delivery",
    {
      title: "Quote Courier Delivery",
      description: "Computes route distance, delivery ETA, and USDC escrow quote for local physical package delivery.",
      inputSchema: z.object({
        pickupAddress: z.string().min(3).max(200).describe("Physical street address for pickup"),
        dropoffAddress: z.string().min(3).max(200).describe("Destination street address for delivery"),
        packageTier: z.enum(["envelope", "small_parcel", "medium_box", "heavy_cargo"]).describe("Physical package size class"),
        urgency: z.enum(["standard", "rush_1hr", "autonomous_drone_instant"]).describe("Delivery speed and vehicle tier"),
      }).strict(),
      outputSchema: z.object({
        quoteId: z.string(),
        pickupAddress: z.string(),
        dropoffAddress: z.string(),
        packageTier: z.string(),
        urgency: z.string(),
        distanceKm: z.number(),
        estimatedMinutes: z.number(),
        vehicleType: z.string(),
        pricing: z.object({
          baseFeeUsdc: z.string(),
          distanceFeeUsdc: z.string(),
          urgencySurchargeUsdc: z.string(),
          totalUsdc: z.string(),
        }).strict(),
        currency: z.literal("USDC"),
        expiresAt: z.string(),
        escrowRecipient: z.string(),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ pickupAddress, dropoffAddress, packageTier, urgency }) => {
      const seed = Math.abs(
        pickupAddress.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) ^
        dropoffAddress.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
      );
      const distanceKm = Math.round(((seed % 140) / 10 + 1.8) * 10) / 10;

      const sizeRateMap: Record<string, number> = {
        envelope: 2.0,
        small_parcel: 3.5,
        medium_box: 5.0,
        heavy_cargo: 12.0,
      };
      const urgencyRateMap: Record<string, { multiplier: number; minutes: number; vehicle: string }> = {
        standard: { multiplier: 1.0, minutes: Math.round(distanceKm * 6 + 25), vehicle: "Cargo E-Bike Courier" },
        rush_1hr: { multiplier: 1.6, minutes: Math.round(distanceKm * 3 + 12), vehicle: "Priority Motor Courier" },
        autonomous_drone_instant: { multiplier: 2.2, minutes: Math.round(distanceKm * 2 + 5), vehicle: "Autonomous Hexacopter Drone" },
      };

      const base = sizeRateMap[packageTier] ?? 3.5;
      const distanceCost = Math.round(distanceKm * 0.75 * 100) / 100;
      const urgencyConfig = urgencyRateMap[urgency] ?? urgencyRateMap.standard;
      const surcharge = Math.round(base * (urgencyConfig.multiplier - 1.0) * 100) / 100;
      const total = Math.round((base + distanceCost + surcharge) * 100) / 100;

      const quoteId = \`QUOTE-\${Date.now().toString(36).toUpperCase()}-\${(seed % 9999).toString().padStart(4, "0")}\`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const escrowRecipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

      const pricing = {
        baseFeeUsdc: base.toFixed(2),
        distanceFeeUsdc: distanceCost.toFixed(2),
        urgencySurchargeUsdc: surcharge.toFixed(2),
        totalUsdc: total.toFixed(2),
      };

      return {
        content: [{
          type: "text",
          text: \`Delivery Quote \${quoteId}: \${distanceKm} km via \${urgencyConfig.vehicle}. Total: \${total.toFixed(2)} USDC (ETA ~\${urgencyConfig.minutes} mins). Lock escrow with book_delivery_escrow.\`,
        }],
        structuredContent: {
          quoteId,
          pickupAddress,
          dropoffAddress,
          packageTier,
          urgency,
          distanceKm,
          estimatedMinutes: urgencyConfig.minutes,
          vehicleType: urgencyConfig.vehicle,
          pricing,
          currency: "USDC" as const,
          expiresAt,
          escrowRecipient,
        },
      };
    },
  );

  // 2. Tool: book_delivery_escrow (EVM Base USDC proposal)
  server.registerTool(
    "book_delivery_escrow",
    {
      title: "Book Delivery Escrow (Base USDC)",
      description: "Generates an unsigned EVM transaction proposal to deposit USDC on Base (eip155:8453) for courier escrow.",
      inputSchema: z.object({
        quoteId: z.string().min(4).max(64).describe("Active quotation ID returned from quote_delivery"),
        senderAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Your 20-byte EVM wallet address"),
        courierEscrowAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Designated courier escrow or recipient wallet address"),
        amountUsdc: z.string().regex(/^(0|[1-9][0-9]*)(?:\\.[0-9]+)?$/).describe("Amount of USDC to deposit (e.g. '4.25')"),
        deliveryInstructions: z.string().max(256).optional().describe("Optional access code or delivery drop instructions"),
      }).strict(),
      outputSchema: evmOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ courierEscrowAddress, amountUsdc }) => {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [courierEscrowAddress as \`0x\${string}\`, BigInt(atomicAmount(amountUsdc, 6))],
      });

      return proposeEvm({
        chain: "eip155:8453",
        to: USDC_BASE_ADDRESS,
        value: "0",
        data,
      });
    },
  );

  // 3. Tool: reserve_smart_locker (Solana lamports proposal)
  server.registerTool(
    "reserve_smart_locker",
    {
      title: "Reserve Smart Parcel Locker (Solana)",
      description: "Generates an unsigned Solana transaction proposal for physical smart locker rental & deposit.",
      inputSchema: z.object({
        hubLocation: z.enum([
          "manhattan_grand_central",
          "brooklyn_navy_yard",
          "soho_courier_point",
          "queens_sunnyside",
        ]).describe("Physical automated locker station hub"),
        lockerSize: z.enum(["small", "medium", "large"]).describe("Compartment size tier"),
        durationHours: z.number().int().min(1).max(72).describe("Locker rental duration in hours"),
        senderSolanaAddress: z.string().min(32).max(44).describe("User's public Solana wallet address"),
        pinCodeHash: z.string().min(4).max(64).describe("Hashed pickup PIN for physical keypad unlock"),
      }).strict(),
      outputSchema: solanaOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ durationHours, senderSolanaAddress }) => {
      const from = new PublicKey(senderSolanaAddress);
      const recipient = new PublicKey(SOLANA_LOCKER_VAULT);
      const lamports = BigInt(durationHours * 2_500_000); // 0.0025 SOL per hour

      const transaction = new Transaction({
        feePayer: from,
        recentBlockhash: "11111111111111111111111111111111",
      }).add(
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: recipient,
          lamports,
        }),
      );

      const transactionBase64 = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString("base64");

      return proposeSolana({ transactionBase64 });
    },
  );

  // 4. Tool: request_corridor_pass (x402 payment proposal)
  server.registerTool(
    "request_corridor_pass",
    {
      title: "Request Drone Corridor Airway Pass (x402)",
      description: "Generates an x402 payment proposal for autonomous delivery vehicle low-altitude air corridor pass.",
      inputSchema: z.object({
        droneRegistrationId: z.string().min(3).max(64).describe("FAA or urban drone tail registration number"),
        corridorZone: z.enum([
          "zone_manhattan_low_alt",
          "zone_east_river_airway",
          "zone_dock_port_entry",
        ]).describe("Designated urban logistics airway corridor"),
        flightWindowMinutes: z.number().int().min(5).max(60).describe("Requested flight clearance window in minutes"),
      }).strict(),
      outputSchema: x402OutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ droneRegistrationId, corridorZone, flightWindowMinutes }) => {
      return proposeX402({
        chain: "eip155:8453",
        url: "https://api.corridorpass.network/v1/clearance",
        method: "POST",
        body: {
          droneRegistrationId,
          corridorZone,
          flightWindowMinutes,
          requestedAt: new Date().toISOString(),
        },
        maxAmount: "50000", // 0.05 USDC
      });
    },
  );

  // 5. Tool: track_dispatch (Read telemetry & proof of delivery)
  server.registerTool(
    "track_dispatch",
    {
      title: "Track Physical Dispatch",
      description: "Queries real-time telemetry, location, courier status, and sensor alerts for active shipments.",
      inputSchema: z.object({
        dispatchId: z.string().min(4).max(64).describe("Dispatch tracking ID (e.g. 'DSP-8821X')"),
      }).strict(),
      outputSchema: z.object({
        dispatchId: z.string(),
        status: z.enum(["pending_pickup", "in_transit", "locker_deposited", "delivered", "exception"]),
        carrier: z.string(),
        currentLocation: z.object({
          latitude: z.number(),
          longitude: z.number(),
          landmark: z.string(),
        }).strict(),
        etaMinutes: z.number(),
        sensorTelemetry: z.object({
          temperatureCelsius: z.number(),
          tamperSealIntact: z.boolean(),
          batteryPercent: z.number(),
        }).strict(),
        proofOfDeliveryHash: z.string(),
        updatedAt: z.string(),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ dispatchId }) => {
      const now = new Date().toISOString();
      return {
        content: [{
          type: "text",
          text: \`Shipment \${dispatchId} is IN TRANSIT via HyperRoute Drone Fleet 4B. Currently at Times Square Corridor (ETA ~11 mins). Sensors normal (19.4°C, seal intact).\`,
        }],
        structuredContent: {
          dispatchId,
          status: "in_transit" as const,
          carrier: "HyperRoute Drone Fleet 4B",
          currentLocation: {
            latitude: 40.7580,
            longitude: -73.9855,
            landmark: "Times Square Air Corridor 120m AGL",
          },
          etaMinutes: 11,
          sensorTelemetry: {
            temperatureCelsius: 19.4,
            tamperSealIntact: true,
            batteryPercent: 88,
          },
          proofOfDeliveryHash: "0x4f82a93c7219e8b417c82a13e2bf405e0391d8a4",
          updatedAt: now,
        },
      };
    },
  );

  // 6. Tool: list_nearby_hubs (Read physical lockers & landing hubs)
  server.registerTool(
    "list_nearby_hubs",
    {
      title: "List Nearby Logistics Hubs",
      description: "Discovers physical parcel lockers, drone landing ports, and micro-fulfillment centers.",
      inputSchema: z.object({
        borough: z.enum(["manhattan", "brooklyn", "queens", "bronx"]).describe("Target metropolitan borough"),
      }).strict(),
      outputSchema: z.object({
        borough: z.string(),
        hubs: z.array(z.object({
          hubId: z.string(),
          name: z.string(),
          address: z.string(),
          lockersAvailable: z.number(),
          dronePadActive: z.boolean(),
          operatingHours: z.string(),
        }).strict()),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ borough }) => {
      const hubDirectory: Record<string, Array<{ hubId: string; name: string; address: string; lockersAvailable: number; dronePadActive: boolean; operatingHours: string }>> = {
        manhattan: [
          { hubId: "manhattan_grand_central", name: "Grand Central Smart Lockers", address: "89 E 42nd St, New York, NY", lockersAvailable: 14, dronePadActive: false, operatingHours: "24/7" },
          { hubId: "soho_courier_point", name: "SoHo Rooftop Drone Vertiport", address: "542 Broadway, New York, NY", lockersAvailable: 8, dronePadActive: true, operatingHours: "06:00 - 22:00" },
        ],
        brooklyn: [
          { hubId: "brooklyn_navy_yard", name: "Navy Yard Autonomous Terminal", address: "63 Flushing Ave, Brooklyn, NY", lockersAvailable: 22, dronePadActive: true, operatingHours: "24/7" },
        ],
        queens: [
          { hubId: "queens_sunnyside", name: "Sunnyside Micro-Logistics Node", address: "43-01 Queens Blvd, Sunnyside, NY", lockersAvailable: 11, dronePadActive: false, operatingHours: "07:00 - 23:00" },
        ],
        bronx: [
          { hubId: "bronx_hunts_point", name: "Hunts Point Cargo Hub", address: "772 Edgewater Rd, Bronx, NY", lockersAvailable: 19, dronePadActive: true, operatingHours: "24/7" },
        ],
      };

      const hubs = hubDirectory[borough] ?? hubDirectory.manhattan;
      return {
        content: [{
          type: "text",
          text: \`Found \${hubs.length} physical logistics hubs in \${borough}.\`,
        }],
        structuredContent: {
          borough,
          hubs,
        },
      };
    },
  );

  return server;
}

serveStdio(createServer, { legacy: "reject" });`,
  },
  "src/paybox.ts": {
    filename: "src/paybox.ts",
    language: "typescript",
    content: `import * as z from "zod/v4";

const key = "io.paybox/transactionProposal";
const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const atomic = z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const common = {
  version: z.literal("1"),
  expiresAt: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$/),
};

export const evmProposalSchema = z.object({
  ...common,
  kind: z.literal("evm"),
  chain: z.string().regex(/^eip155:(0|[1-9][0-9]*)$/),
  transaction: z.object({
    to: evmAddress,
    value: atomic,
    data: z.string().regex(/^0x(?:[0-9a-fA-F]{2})*$/),
  }).strict(),
}).strict();

export const solanaProposalSchema = z.object({
  ...common,
  kind: z.literal("solana"),
  chain: z.literal("solana:mainnet"),
  transaction: z.object({
    transactionBase64: z.string(),
  }).strict(),
}).strict();

export const x402ProposalSchema = z.object({
  ...common,
  kind: z.literal("x402"),
  chain: z.enum(["eip155:8453", "solana:mainnet"]),
  request: z.object({
    url: z.url().max(2048),
    method: z.enum(["GET", "POST"]),
    body: z.json().optional(),
  }).strict(),
  payment: z.object({
    asset: z.string(),
    maxAmount: z.string().regex(/^[1-9][0-9]{0,19}$/),
  }).strict(),
}).strict();

export const evmOutputSchema = z.object({ [key]: evmProposalSchema }).strict();
export const solanaOutputSchema = z.object({ [key]: solanaProposalSchema }).strict();
export const x402OutputSchema = z.object({ [key]: x402ProposalSchema }).strict();

export { key };

function envelope(expiresAt = new Date(Date.now() + 240_000).toISOString().replace(/\\.\\d{3}Z$/, "Z")) {
  const timestamp = Date.parse(expiresAt);
  const now = Date.now();
  if (
    !Number.isFinite(timestamp) ||
    timestamp <= now ||
    timestamp > now + 300_000 ||
    new Date(timestamp).toISOString().replace(/\\.\\d{3}Z$/, "Z") !== expiresAt
  ) {
    throw new Error("Expiry must be a whole-second UTC timestamp within five minutes.");
  }
  return { version: "1" as const, expiresAt };
}

export function proposeEvm(input: { chain: string; to: string; value?: string; data?: string; expiresAt?: string }) {
  const proposal = evmProposalSchema.parse({
    ...envelope(input.expiresAt),
    kind: "evm",
    chain: input.chain,
    transaction: { to: input.to, value: input.value ?? "0", data: input.data ?? "0x" },
  });
  if (BigInt(proposal.transaction.value) >= 2n ** 256n) throw new Error("EVM value exceeds uint256.");
  if (BigInt(proposal.chain.slice(7)) >= 2n ** 64n) throw new Error("EVM chain ID exceeds uint64.");
  if ((proposal.transaction.data.length - 2) / 2 > 120 * 1024) throw new Error("EVM calldata exceeds 120 KiB.");
  return {
    content: [{ type: "text" as const, text: "Unsigned proposal prepared. PayBox must validate and obtain any required approval; nothing has been signed or paid." }],
    structuredContent: { [key]: proposal },
  };
}

export function proposeSolana(input: { transactionBase64: string; expiresAt?: string }) {
  const bytes = Buffer.from(input.transactionBase64, "base64");
  if (!bytes.length || bytes.length > 1232 || bytes.toString("base64") !== input.transactionBase64) {
    throw new Error("Use canonical padded Base64 for an unsigned Solana transaction of at most 1,232 bytes.");
  }
  const proposal = solanaProposalSchema.parse({
    ...envelope(input.expiresAt),
    kind: "solana",
    chain: "solana:mainnet",
    transaction: { transactionBase64: input.transactionBase64 },
  });
  return {
    content: [{ type: "text" as const, text: "Unsigned Solana proposal prepared. PayBox must validate and obtain any required approval; nothing has been signed or paid." }],
    structuredContent: { [key]: proposal },
  };
}

export function proposeX402(input: {
  chain: "eip155:8453" | "solana:mainnet";
  url: string;
  maxAmount: string;
  method?: "GET" | "POST";
  body?: any;
  expiresAt?: string;
}) {
  const url = new URL(input.url);
  const method = input.method ?? "GET";
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password || url.hash) {
    throw new Error("x402 requires HTTPS port 443 without URL credentials or fragments.");
  }
  if (method === "GET" && input.body !== undefined) throw new Error("x402 GET requests cannot have a body.");
  if (Buffer.byteLength(JSON.stringify(input.body ?? null)) > 64 * 1024) {
    throw new Error("x402 JSON body exceeds 64 KiB.");
  }
  const proposal = x402ProposalSchema.parse({
    ...envelope(input.expiresAt),
    kind: "x402",
    chain: input.chain,
    request: { url: url.toString(), method, ...(input.body === undefined ? {} : { body: input.body }) },
    payment: {
      asset: input.chain === "solana:mainnet" ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" : "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      maxAmount: input.maxAmount,
    },
  });
  if (BigInt(proposal.payment.maxAmount) >= 2n ** 64n) throw new Error("x402 maxAmount exceeds uint64.");
  return {
    content: [{ type: "text" as const, text: "Unsigned x402 payment proposal prepared. PayBox must validate and obtain any required approval." }],
    structuredContent: { [key]: proposal },
  };
}

export function atomicAmount(amount: string, decimals: number): string {
  if (
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 255 ||
    amount.length > 256 ||
    !/^(0|[1-9][0-9]*)(?:\\.[0-9]+)?$/.test(amount)
  ) {
    throw new Error("Use a nonnegative decimal string and an integer token precision from 0 to 255.");
  }
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) throw new Error("Amount has more decimal places than the asset supports.");
  return BigInt(\`\${whole}\${fraction.padEnd(decimals, "0")}\`).toString();
}`,
  },
  "paybox-plugin.json": {
    filename: "paybox-plugin.json",
    language: "json",
    content: `{
  "tool": "quote_delivery",
  "arguments": {
    "pickupAddress": "100 Broadway, New York, NY 10005",
    "dropoffAddress": "450 Lexington Ave, New York, NY 10017",
    "packageTier": "medium_box",
    "urgency": "rush_1hr"
  }
}`,
  },
  "package.json": {
    filename: "package.json",
    language: "json",
    content: `{
  "name": "paybox-local-logistics",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": "24.x",
    "pnpm": "11.11.0"
  },
  "packageManager": "pnpm@11.11.0",
  "scripts": {
    "dev": "tsx src/plugin.ts",
    "build": "esbuild src/plugin.ts --bundle --platform=node --format=esm --target=node24 --banner:js=\\"import { createRequire as _cR } from 'module'; const require = _cR(import.meta.url);\\" --minify --outfile=dist/plugin.mjs",
    "conformance": "node scripts/conformance.mjs",
    "test": "node scripts/test.mjs",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "2.0.0",
    "@solana/web3.js": "1.98.0",
    "viem": "2.51.3",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@types/node": "24.12.2",
    "ajv": "8.20.0",
    "esbuild": "0.28.2",
    "tsx": "4.23.12",
    "typescript": "5.9.3"
  }
}`,
  },
  "starter-version.json": {
    filename: "starter-version.json",
    language: "json",
    content: `{
  "version": "1.0.2",
  "protocolVersion": "2026-07-28",
  "node": "24.21.0",
  "pnpm": "11.11.0"
}`,
  },
};
