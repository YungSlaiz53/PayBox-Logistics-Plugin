import { McpServer } from "@modelcontextprotocol/server";
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
const USDC_BASE_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as `0x${string}`;
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
      // Deterministic calculation based on string hashes for repeatable testing
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

      const quoteId = `QUOTE-${Date.now().toString(36).toUpperCase()}-${(seed % 9999).toString().padStart(4, "0")}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const escrowRecipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

      const pricing = {
        baseFeeUsdc: base.toFixed(2),
        distanceFeeUsdc: distanceCost.toFixed(2),
        urgencySurchargeUsdc: surcharge.toFixed(2),
        totalUsdc: total.toFixed(2),
      };

      const structuredContent = {
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
      };

      return {
        content: [{
          type: "text",
          text: `Delivery Quote ${quoteId}: ${distanceKm} km via ${urgencyConfig.vehicle}. Total: ${total.toFixed(2)} USDC (ETA ~${urgencyConfig.minutes} mins). Lock escrow with book_delivery_escrow.`,
        }],
        structuredContent,
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
        amountUsdc: z.string().regex(/^(0|[1-9][0-9]*)(?:\.[0-9]+)?$/).describe("Amount of USDC to deposit (e.g. '4.25')"),
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
        args: [courierEscrowAddress as `0x${string}`, BigInt(atomicAmount(amountUsdc, 6))],
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
      const structuredContent = {
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
      };

      return {
        content: [{
          type: "text",
          text: `Shipment ${dispatchId} is IN TRANSIT via HyperRoute Drone Fleet 4B. Currently at Times Square Corridor (ETA ~11 mins). Sensors normal (19.4°C, seal intact).`,
        }],
        structuredContent,
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
          text: `Found ${hubs.length} physical logistics hubs in ${borough}.`,
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

serveStdio(createServer, { legacy: "reject" });
