export interface ToolDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  category: 'quote' | 'evm' | 'solana' | 'x402' | 'telemetry' | 'directory';
  chain?: 'eip155:8453' | 'solana:mainnet';
  proposalKind?: 'evm' | 'solana' | 'x402';
  defaultArgs: Record<string, any>;
  inputSchemaJson: Record<string, any>;
  outputSchemaJson: Record<string, any>;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: "quote_delivery",
    name: "quote_delivery",
    title: "Quote Courier Delivery",
    description: "Computes route distance, delivery ETA, and USDC escrow quote for local physical package delivery.",
    category: "quote",
    defaultArgs: {
      pickupAddress: "100 Broadway, New York, NY 10005",
      dropoffAddress: "450 Lexington Ave, New York, NY 10017",
      packageTier: "medium_box",
      urgency: "rush_1hr",
    },
    inputSchemaJson: {
      type: "object",
      properties: {
        pickupAddress: { type: "string", minLength: 3, maxLength: 200, description: "Physical street address for pickup" },
        dropoffAddress: { type: "string", minLength: 3, maxLength: 200, description: "Destination street address for delivery" },
        packageTier: { type: "string", enum: ["envelope", "small_parcel", "medium_box", "heavy_cargo"], description: "Physical package size class" },
        urgency: { type: "string", enum: ["standard", "rush_1hr", "autonomous_drone_instant"], description: "Delivery speed and vehicle tier" },
      },
      required: ["pickupAddress", "dropoffAddress", "packageTier", "urgency"],
      additionalProperties: false,
    },
    outputSchemaJson: {
      type: "object",
      properties: {
        quoteId: { type: "string" },
        pickupAddress: { type: "string" },
        dropoffAddress: { type: "string" },
        packageTier: { type: "string" },
        urgency: { type: "string" },
        distanceKm: { type: "number" },
        estimatedMinutes: { type: "number" },
        vehicleType: { type: "string" },
        pricing: {
          type: "object",
          properties: {
            baseFeeUsdc: { type: "string" },
            distanceFeeUsdc: { type: "string" },
            urgencySurchargeUsdc: { type: "string" },
            totalUsdc: { type: "string" },
          },
          required: ["baseFeeUsdc", "distanceFeeUsdc", "urgencySurchargeUsdc", "totalUsdc"],
          additionalProperties: false,
        },
        currency: { type: "string", const: "USDC" },
        expiresAt: { type: "string" },
        escrowRecipient: { type: "string" },
      },
      required: ["quoteId", "pickupAddress", "dropoffAddress", "packageTier", "urgency", "distanceKm", "estimatedMinutes", "vehicleType", "pricing", "currency", "expiresAt", "escrowRecipient"],
      additionalProperties: false,
    },
  },
  {
    id: "book_delivery_escrow",
    name: "book_delivery_escrow",
    title: "Book Delivery Escrow (Base USDC)",
    description: "Generates an unsigned EVM transaction proposal to deposit USDC on Base (eip155:8453) for courier escrow.",
    category: "evm",
    chain: "eip155:8453",
    proposalKind: "evm",
    defaultArgs: {
      quoteId: "QUOTE-MVCI45QA-0986",
      senderAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      courierEscrowAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      amountUsdc: "9.80",
      deliveryInstructions: "Leave inside parcel drop chute at reception desk.",
    },
    inputSchemaJson: {
      type: "object",
      properties: {
        quoteId: { type: "string", minLength: 4, maxLength: 64, description: "Active quotation ID returned from quote_delivery" },
        senderAddress: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$", description: "Your 20-byte EVM wallet address" },
        courierEscrowAddress: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$", description: "Designated courier escrow or recipient wallet address" },
        amountUsdc: { type: "string", pattern: "^(0|[1-9][0-9]*)(?:\\.[0-9]+)?$", description: "Amount of USDC to deposit (e.g. '4.25')" },
        deliveryInstructions: { type: "string", maxLength: 256, description: "Optional access code or delivery drop instructions" },
      },
      required: ["quoteId", "senderAddress", "courierEscrowAddress", "amountUsdc"],
      additionalProperties: false,
    },
    outputSchemaJson: {
      type: "object",
      properties: {
        "io.paybox/transactionProposal": {
          type: "object",
          properties: {
            version: { type: "string", const: "1" },
            expiresAt: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" },
            kind: { type: "string", const: "evm" },
            chain: { type: "string", pattern: "^eip155:(0|[1-9][0-9]*)$" },
            transaction: {
              type: "object",
              properties: {
                to: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
                value: { type: "string", pattern: "^(0|[1-9][0-9]{0,77})$" },
                data: { type: "string", pattern: "^0x(?:[0-9a-fA-F]{2})*$" },
              },
              required: ["to", "value", "data"],
              additionalProperties: false,
            },
          },
          required: ["version", "expiresAt", "kind", "chain", "transaction"],
          additionalProperties: false,
        },
      },
      required: ["io.paybox/transactionProposal"],
      additionalProperties: false,
    },
  },
  {
    id: "reserve_smart_locker",
    name: "reserve_smart_locker",
    title: "Reserve Smart Parcel Locker (Solana)",
    description: "Generates an unsigned Solana transaction proposal for physical smart locker rental & deposit.",
    category: "solana",
    chain: "solana:mainnet",
    proposalKind: "solana",
    defaultArgs: {
      hubLocation: "manhattan_grand_central",
      lockerSize: "medium",
      durationHours: 6,
      senderSolanaAddress: "4Nd1mBQvEJd1KkHk3N4YdD4P8R8oQ3W9zZ2m2F8u5sQJ",
      pinCodeHash: "a89cf129e08b1",
    },
    inputSchemaJson: {
      type: "object",
      properties: {
        hubLocation: {
          type: "string",
          enum: ["manhattan_grand_central", "brooklyn_navy_yard", "soho_courier_point", "queens_sunnyside"],
          description: "Physical automated locker station hub",
        },
        lockerSize: { type: "string", enum: ["small", "medium", "large"], description: "Compartment size tier" },
        durationHours: { type: "integer", minimum: 1, maximum: 72, description: "Locker rental duration in hours" },
        senderSolanaAddress: { type: "string", minLength: 32, maxLength: 44, description: "User's public Solana wallet address" },
        pinCodeHash: { type: "string", minLength: 4, maxLength: 64, description: "Hashed pickup PIN for physical keypad unlock" },
      },
      required: ["hubLocation", "lockerSize", "durationHours", "senderSolanaAddress", "pinCodeHash"],
      additionalProperties: false,
    },
    outputSchemaJson: {
      type: "object",
      properties: {
        "io.paybox/transactionProposal": {
          type: "object",
          properties: {
            version: { type: "string", const: "1" },
            expiresAt: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" },
            kind: { type: "string", const: "solana" },
            chain: { type: "string", const: "solana:mainnet" },
            transaction: {
              type: "object",
              properties: {
                transactionBase64: { type: "string" },
              },
              required: ["transactionBase64"],
              additionalProperties: false,
            },
          },
          required: ["version", "expiresAt", "kind", "chain", "transaction"],
          additionalProperties: false,
        },
      },
      required: ["io.paybox/transactionProposal"],
      additionalProperties: false,
    },
  },
  {
    id: "request_corridor_pass",
    name: "request_corridor_pass",
    title: "Request Drone Corridor Airway Pass (x402)",
    description: "Generates an x402 payment proposal for autonomous delivery vehicle low-altitude air corridor pass.",
    category: "x402",
    chain: "eip155:8453",
    proposalKind: "x402",
    defaultArgs: {
      droneRegistrationId: "FA-9821-HEXADRONE",
      corridorZone: "zone_manhattan_low_alt",
      flightWindowMinutes: 25,
    },
    inputSchemaJson: {
      type: "object",
      properties: {
        droneRegistrationId: { type: "string", minLength: 3, maxLength: 64, description: "FAA or urban drone tail registration number" },
        corridorZone: {
          type: "string",
          enum: ["zone_manhattan_low_alt", "zone_east_river_airway", "zone_dock_port_entry"],
          description: "Designated urban logistics airway corridor",
        },
        flightWindowMinutes: { type: "integer", minimum: 5, maximum: 60, description: "Requested flight clearance window in minutes" },
      },
      required: ["droneRegistrationId", "corridorZone", "flightWindowMinutes"],
      additionalProperties: false,
    },
    outputSchemaJson: {
      type: "object",
      properties: {
        "io.paybox/transactionProposal": {
          type: "object",
          properties: {
            version: { type: "string", const: "1" },
            expiresAt: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" },
            kind: { type: "string", const: "x402" },
            chain: { type: "string", enum: ["eip155:8453", "solana:mainnet"] },
            request: {
              type: "object",
              properties: {
                url: { type: "string", maxLength: 2048 },
                method: { type: "string", enum: ["GET", "POST"] },
                body: { type: "object" },
              },
              required: ["url", "method"],
              additionalProperties: false,
            },
            payment: {
              type: "object",
              properties: {
                asset: { type: "string" },
                maxAmount: { type: "string", pattern: "^[1-9][0-9]{0,19}$" },
              },
              required: ["asset", "maxAmount"],
              additionalProperties: false,
            },
          },
          required: ["version", "expiresAt", "kind", "chain", "request", "payment"],
          additionalProperties: false,
        },
      },
      required: ["io.paybox/transactionProposal"],
      additionalProperties: false,
    },
  },
  {
    id: "track_dispatch",
    name: "track_dispatch",
    title: "Track Physical Dispatch",
    description: "Queries real-time telemetry, location, courier status, and sensor alerts for active shipments.",
    category: "telemetry",
    defaultArgs: {
      dispatchId: "DSP-8821X-NY",
    },
    inputSchemaJson: {
      type: "object",
      properties: {
        dispatchId: { type: "string", minLength: 4, maxLength: 64, description: "Dispatch tracking ID (e.g. 'DSP-8821X-NY')" },
      },
      required: ["dispatchId"],
      additionalProperties: false,
    },
    outputSchemaJson: {
      type: "object",
      properties: {
        dispatchId: { type: "string" },
        status: { type: "string", enum: ["pending_pickup", "in_transit", "locker_deposited", "delivered", "exception"] },
        carrier: { type: "string" },
        currentLocation: {
          type: "object",
          properties: {
            latitude: { type: "number" },
            longitude: { type: "number" },
            landmark: { type: "string" },
          },
          required: ["latitude", "longitude", "landmark"],
          additionalProperties: false,
        },
        etaMinutes: { type: "number" },
        sensorTelemetry: {
          type: "object",
          properties: {
            temperatureCelsius: { type: "number" },
            tamperSealIntact: { type: "boolean" },
            batteryPercent: { type: "number" },
          },
          required: ["temperatureCelsius", "tamperSealIntact", "batteryPercent"],
          additionalProperties: false,
        },
        proofOfDeliveryHash: { type: "string" },
        updatedAt: { type: "string" },
      },
      required: ["dispatchId", "status", "carrier", "currentLocation", "etaMinutes", "sensorTelemetry", "proofOfDeliveryHash", "updatedAt"],
      additionalProperties: false,
    },
  },
  {
    id: "list_nearby_hubs",
    name: "list_nearby_hubs",
    title: "List Nearby Logistics Hubs",
    description: "Discovers physical parcel lockers, drone landing ports, and micro-fulfillment centers.",
    category: "directory",
    defaultArgs: {
      borough: "manhattan",
    },
    inputSchemaJson: {
      type: "object",
      properties: {
        borough: { type: "string", enum: ["manhattan", "brooklyn", "queens", "bronx"], description: "Target metropolitan borough" },
      },
      required: ["borough"],
      additionalProperties: false,
    },
    outputSchemaJson: {
      type: "object",
      properties: {
        borough: { type: "string" },
        hubs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              hubId: { type: "string" },
              name: { type: "string" },
              address: { type: "string" },
              lockersAvailable: { type: "number" },
              dronePadActive: { type: "boolean" },
              operatingHours: { type: "string" },
            },
            required: ["hubId", "name", "address", "lockersAvailable", "dronePadActive", "operatingHours"],
            additionalProperties: false,
          },
        },
      },
      required: ["borough", "hubs"],
      additionalProperties: false,
    },
  },
];

export const CONFORMANCE_REPORT = {
  reportVersion: 1,
  starterVersion: "1.0.2",
  protocolVersion: "2026-07-28",
  toolchain: {
    node: "24.21.0",
    platform: "linux",
    arch: "x64",
  },
  durationMs: 1161,
  status: "passed",
  sampleCall: {
    tool: "quote_delivery",
    status: "passed",
  },
  artifact: {
    bytes: 1144221,
    sha256: "3a51f416dc4ab219f7ffdc39ed1fa50f574e3614d556b9b84b549df4e3e41832",
  },
  discoveredToolCount: 6,
};
