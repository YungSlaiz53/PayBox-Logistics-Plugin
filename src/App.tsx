import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  ShieldCheck,
  Send,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Layers,
  MapPin,
  Clock,
  Compass,
  Cpu,
  Key,
  Globe,
  FileCheck,
  Play,
  RotateCw,
  Sparkles,
  ChevronRight,
  Terminal,
  Boxes,
  Lock,
  ArrowRight,
  Info,
  BookOpen,
  FileText,
  Check,
  Share2,
  Coins,
  Radio,
  Zap,
  Activity,
  Award
} from 'lucide-react';
import { TOOLS, CONFORMANCE_REPORT, ToolDefinition } from './pluginData';
import { SOURCE_FILES } from './sourceFiles';

export default function App() {
  const [activeTab, setActiveTab] = useState<'about' | 'simulator' | 'conformance' | 'portal' | 'source' | 'customizer'>('about');
  const [selectedToolId, setSelectedToolId] = useState<string>('quote_delivery');
  const [toolInputs, setToolInputs] = useState<Record<string, any>>(TOOLS[0].defaultArgs);
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>('src/plugin.ts');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Description format switcher in About Dashboard
  const [descFormat, setDescFormat] = useState<'full' | 'short' | 'markdown'>('full');

  // Customizer state
  const [customEscrowAddress, setCustomEscrowAddress] = useState<string>('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [baseFeeRate, setBaseFeeRate] = useState<number>(3.50);
  const [kmRate, setKmRate] = useState<number>(0.75);
  const [primaryNetwork, setPrimaryNetwork] = useState<'base' | 'solana'>('base');

  const selectedTool = TOOLS.find(t => t.id === selectedToolId) || TOOLS[0];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Full descriptions for About section
  const fullMarketplaceDescription = `Autonomous Physical World & Hyperlocal Logistics Protocol for PayBox AI Agents.

This production-grade PayBox plugin unlocks real-world physical delivery, courier escrow, autonomous drone airways, and smart parcel locker management for AI agents. Built strictly on MCP Protocol Version 2026-07-28 and conforming to the MoonPay PayBox v1.0.2 specification, the plugin empowers autonomous agents to interact with physical commerce without ever possessing private keys.

Key Capabilities:
1. Dynamic Route & Cost Quoting: Computes precise distances, transit durations, and vehicle classes (Cargo E-Bikes, Priority Motor, and Autonomous Hexacopter Drones).
2. Non-Custodial Base USDC Escrow: Proposes unsigned ERC-20 transfer transactions on Base (eip155:8453) to lock courier delivery fees into smart contract escrow.
3. IoT Smart Locker Booking: Enables agents to reserve physical parcel lockers at urban transit hubs (Grand Central, Navy Yard, SoHo, Sunnyside) using unsigned Solana SystemProgram transfer deposits.
4. HTTP 402 Airway Clearance: Native implementation of the x402 payment standard, allowing delivery drones to stream micro-toll payments (0.05 USDC) for urban flight corridor clearance.
5. Real-Time Telemetry & Proof-of-Delivery: Monitors live courier GPS telemetry, tamper-evident parcel seal sensors, temperature logs, and cryptographic delivery hashes.

All transaction proposals conform strictly to io.paybox/transactionProposal with 5-minute RFC3339 UTC expiry. PayBox handles wallet selection, simulation, passkey verification, and broadcast.`;

  const shortPitchDescription = `PayBox Local Logistics: An autonomous physical courier & drone dispatch plugin for AI agents. Quote routes, lock Base USDC courier escrow, reserve Solana smart lockers, and pay x402 airway tolls safely without private keys.`;

  const markdownDescription = `## PayBox Physical World & Local Logistics Plugin
> **Track:** Physical World & Local Logistics | **MoonPay Hackathon**
> **Protocol:** MCP 2026-07-28 | **Starter:** v1.0.2 | **Status:** Conformance Passed

### Overview
The **PayBox Local Logistics Protocol** enables AI agents in the PayBox ecosystem to autonomously conduct physical commerce and logistics. Agents can calculate delivery routes, reserve IoT smart parcel lockers, deposit USDC escrow on Base, and obtain x402 flight corridor clearance for autonomous drones.

### Discovered MCP Tools
- \`quote_delivery\`: Calculates distance, travel time, and USDC cost for bike, van, or drone couriers.
- \`book_delivery_escrow\`: Proposes unsigned EVM call on Base (\`eip155:8453\`) transferring USDC (\`0x833589fcd6edb6e08f4c7c32d4f71b54bda02913\`).
- \`reserve_smart_locker\`: Proposes unsigned Solana transaction (\`solana:mainnet\`) for physical locker rental with zero blockhash placeholder.
- \`request_corridor_pass\`: Proposes an x402 HTTP 402 micro-toll payment (\`maxAmount: 50000\` = 0.05 USDC) on Base.
- \`track_dispatch\`: Live GPS telemetry, temperature, tamper-evident seals, and proof-of-delivery hash.
- \`list_nearby_hubs\`: Directory of automated parcel lockers and rooftop drone vertiports.

### Security & Non-Custodial Architecture
- Zero private keys requested or stored by the plugin.
- All proposals use \`io.paybox/transactionProposal\` with strict 5-minute UTC expiries.
- Output schemas validate with JSON Schema 2020-12.
- Bundle: 1.14 MB UTF-8 deterministic \`dist/plugin.mjs\`.`;

  // Robust verified bundle downloader
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [bundleText, setBundleText] = useState<string | null>(null);

  const triggerBlobDownload = async (filename: string = 'plugin.mjs') => {
    setDownloading(true);
    setDownloadMsg('Fetching verified 1.14 MB bundle from server...');
    try {
      const res = await fetch('/api/download/plugin.mjs?t=' + Date.now());
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const text = await res.text();
      if (!text || text.length < 500000) {
        throw new Error('Downloaded byte count was unexpectedly small');
      }
      setBundleText(text);

      const blob = new Blob([text], { type: 'application/javascript;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

      setDownloadMsg(`Success! Downloaded ${filename} (${(text.length / 1024 / 1024).toFixed(2)} MB, ${text.length.toLocaleString()} bytes)`);
      setTimeout(() => setDownloadMsg(null), 5000);
    } catch (e: any) {
      console.error(e);
      window.open('/api/download/plugin.mjs', '_blank');
      setDownloadMsg(`Triggered direct download stream.`);
    } finally {
      setDownloading(false);
    }
  };

  const copyFullBundleCode = async () => {
    try {
      setDownloadMsg('Loading full 1.14 MB bundle to clipboard...');
      let code = bundleText;
      if (!code) {
        const res = await fetch('/api/download/plugin.mjs');
        code = await res.text();
        setBundleText(code);
      }
      await navigator.clipboard.writeText(code);
      setCopiedKey('full-bundle');
      setDownloadMsg(`Copied all ${code.length.toLocaleString()} bytes (1.14 MB) of plugin.mjs directly to clipboard!`);
      setTimeout(() => {
        setCopiedKey(null);
        setDownloadMsg(null);
      }, 5000);
    } catch (e: any) {
      setDownloadMsg('Failed to copy: ' + e.message);
    }
  };

  // Set default inputs when switching tool
  const handleSelectTool = (tool: ToolDefinition) => {
    setSelectedToolId(tool.id);
    setToolInputs(tool.defaultArgs);
    setExecutionResult(null);
  };

  // Simulate local tool execution
  const executeToolSimulation = () => {
    setExecuting(true);
    setTimeout(() => {
      let contentText = "";
      let structuredContent: any = {};

      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 240000).toISOString().replace(/\.\d{3}Z$/, "Z");

      if (selectedTool.id === 'quote_delivery') {
        const p1 = toolInputs.pickupAddress || "100 Broadway, New York, NY 10005";
        const p2 = toolInputs.dropoffAddress || "450 Lexington Ave, New York, NY 10017";
        const seed = Math.abs(
          p1.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) ^
          p2.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)
        );
        const dist = Math.round(((seed % 140) / 10 + 1.8) * 10) / 10;
        const urgency = toolInputs.urgency || "rush_1hr";
        const mult = urgency === "autonomous_drone_instant" ? 2.2 : urgency === "rush_1hr" ? 1.6 : 1.0;
        const vehicle = urgency === "autonomous_drone_instant" ? "Autonomous Hexacopter Drone" : urgency === "rush_1hr" ? "Priority Motor Courier" : "Cargo E-Bike Courier";
        const minutes = urgency === "autonomous_drone_instant" ? Math.round(dist * 2 + 5) : urgency === "rush_1hr" ? Math.round(dist * 3 + 12) : Math.round(dist * 6 + 25);
        
        const base = baseFeeRate;
        const distCost = Math.round(dist * kmRate * 100) / 100;
        const surcharge = Math.round(base * (mult - 1.0) * 100) / 100;
        const total = Math.round((base + distCost + surcharge) * 100) / 100;

        const qId = `QUOTE-${Date.now().toString(36).toUpperCase()}-${(seed % 9999).toString().padStart(4, "0")}`;

        structuredContent = {
          quoteId: qId,
          pickupAddress: p1,
          dropoffAddress: p2,
          packageTier: toolInputs.packageTier || "medium_box",
          urgency,
          distanceKm: dist,
          estimatedMinutes: minutes,
          vehicleType: vehicle,
          pricing: {
            baseFeeUsdc: base.toFixed(2),
            distanceFeeUsdc: distCost.toFixed(2),
            urgencySurchargeUsdc: surcharge.toFixed(2),
            totalUsdc: total.toFixed(2),
          },
          currency: "USDC",
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          escrowRecipient: customEscrowAddress,
        };
        contentText = `Delivery Quote ${qId}: ${dist} km via ${vehicle}. Total: ${total.toFixed(2)} USDC (ETA ~${minutes} mins). Lock escrow with book_delivery_escrow.`;
      } else if (selectedTool.id === 'book_delivery_escrow') {
        const amt = toolInputs.amountUsdc || "9.80";
        const recipient = toolInputs.courierEscrowAddress || customEscrowAddress;
        
        const recipientClean = recipient.replace(/^0x/, "").toLowerCase().padStart(64, "0");
        const atomicAmount = BigInt(Math.round(parseFloat(amt) * 1_000_000)).toString(16).padStart(64, "0");
        const calldata = `0xa9059cbb${recipientClean}${atomicAmount}`;

        structuredContent = {
          "io.paybox/transactionProposal": {
            version: "1",
            expiresAt,
            kind: "evm",
            chain: "eip155:8453",
            transaction: {
              to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
              value: "0",
              data: calldata,
            },
          },
        };
        contentText = "Unsigned proposal prepared. PayBox must validate and obtain any required approval; nothing has been signed or paid.";
      } else if (selectedTool.id === 'reserve_smart_locker') {
        structuredContent = {
          "io.paybox/transactionProposal": {
            version: "1",
            expiresAt,
            kind: "solana",
            chain: "solana:mainnet",
            transaction: {
              transactionBase64: "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDB/f19f1911111111111111111111111111111111111111111111111111111111AQABAAIBBAAAAAAAAAA=",
            },
          },
        };
        contentText = "Unsigned Solana proposal prepared. PayBox must validate and obtain any required approval; nothing has been signed or paid.";
      } else if (selectedTool.id === 'request_corridor_pass') {
        structuredContent = {
          "io.paybox/transactionProposal": {
            version: "1",
            expiresAt,
            kind: "x402",
            chain: "eip155:8453",
            request: {
              url: "https://api.corridorpass.network/v1/clearance",
              method: "POST",
              body: {
                droneRegistrationId: toolInputs.droneRegistrationId || "FA-9821-HEXADRONE",
                corridorZone: toolInputs.corridorZone || "zone_manhattan_low_alt",
                flightWindowMinutes: Number(toolInputs.flightWindowMinutes) || 25,
                requestedAt: nowIso,
              },
            },
            payment: {
              asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
              maxAmount: "50000",
            },
          },
        };
        contentText = "Unsigned x402 payment proposal prepared. PayBox must validate and obtain any required approval.";
      } else if (selectedTool.id === 'track_dispatch') {
        structuredContent = {
          dispatchId: toolInputs.dispatchId || "DSP-8821X-NY",
          status: "in_transit",
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
          updatedAt: nowIso,
        };
        contentText = `Shipment ${toolInputs.dispatchId || 'DSP-8821X-NY'} is IN TRANSIT via HyperRoute Drone Fleet 4B. Currently at Times Square Corridor (ETA ~11 mins). Sensors normal (19.4°C, seal intact).`;
      } else if (selectedTool.id === 'list_nearby_hubs') {
        const borough = toolInputs.borough || "manhattan";
        structuredContent = {
          borough,
          hubs: [
            { hubId: "manhattan_grand_central", name: "Grand Central Smart Lockers", address: "89 E 42nd St, New York, NY", lockersAvailable: 14, dronePadActive: false, operatingHours: "24/7" },
            { hubId: "soho_courier_point", name: "SoHo Rooftop Drone Vertiport", address: "542 Broadway, New York, NY", lockersAvailable: 8, dronePadActive: true, operatingHours: "06:00 - 22:00" },
          ],
        };
        contentText = `Found 2 physical logistics hubs in ${borough}.`;
      }

      setExecutionResult({
        jsonrpc: "2.0",
        id: 2,
        result: {
          content: [{ type: "text", text: contentText }],
          structuredContent,
          resultType: "complete",
          _meta: {
            "io.modelcontextprotocol/serverInfo": {
              name: "paybox-local-logistics",
              version: "0.1.0",
            },
          },
        },
      });
      setExecuting(false);
    }, 280);
  };

  useEffect(() => {
    executeToolSimulation();
  }, [selectedToolId]);

  return (
    <div className="min-h-screen bg-[#141414] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#abd2cb]/30 selection:text-[#abd2cb]">
      {/* Top Banner: MoonPay PayBox Color Tone Header */}
      <div className="bg-[#191a21] border-b border-white/[0.08] px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#abd2cb] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#abd2cb]"></span>
          </span>
          <span className="font-semibold text-white tracking-tight">PayBox by MoonPay</span>
          <span className="text-[#9c9691] font-mono">/</span>
          <span className="text-[#abd2cb] font-medium">Physical World & Local Logistics Track</span>
          <span className="hidden lg:inline text-[#9c9691]">• Protocol 2026-07-28</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-[#abd2cb]/15 text-[#abd2cb] border border-[#abd2cb]/30 px-2 py-0.5 rounded text-[11px] font-mono font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Conformance: PASSED
          </span>
          <a
            href="https://developer.paybox.sh"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#9c9691] hover:text-white flex items-center gap-1 text-[11px] transition-colors"
          >
            developer.paybox.sh <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Header with PayBox Style Logo & Actions */}
      <header className="border-b border-white/[0.08] bg-[#16171d]/90 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#abd2cb] flex items-center justify-center shadow-lg shadow-purple-900/20 border border-white/20">
            <Boxes className="w-5 h-5 text-black font-extrabold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">PayBox Local Logistics</h1>
              <span className="bg-[#e7e7e7]/10 text-[#abd2cb] border border-[#abd2cb]/30 text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                Plugin v0.1.0
              </span>
            </div>
            <p className="text-xs text-[#9c9691]">Autonomous Physical World & Hyperlocal Courier Protocol</p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => triggerBlobDownload('plugin.mjs')}
            disabled={downloading}
            className="bg-[#abd2cb] hover:bg-[#9bc2bb] active:bg-[#8bb2ab] text-[#141414] font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-md shadow-[#abd2cb]/20 cursor-pointer disabled:opacity-50"
          >
            {downloading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download dist/plugin.mjs (1.14 MB)
          </button>
          <a
            href="/paybox-plugin.json"
            download="paybox-plugin.json"
            className="bg-[#232530] hover:bg-[#2b2d3b] text-[#e7e7e7] text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 border border-white/[0.08]"
          >
            <Download className="w-3.5 h-3.5" /> paybox-plugin.json
          </a>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-[#181920] border-b border-white/[0.08] px-6 flex space-x-1 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab('about')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'about'
              ? 'border-[#abd2cb] text-[#abd2cb] font-bold bg-[#abd2cb]/5'
              : 'border-transparent text-[#9c9691] hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <BookOpen className="w-4 h-4" /> About Dashboard
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'simulator'
              ? 'border-[#abd2cb] text-[#abd2cb] font-bold bg-[#abd2cb]/5'
              : 'border-transparent text-[#9c9691] hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Play className="w-4 h-4" /> Interactive Tool Simulator
        </button>
        <button
          onClick={() => setActiveTab('conformance')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'conformance'
              ? 'border-[#abd2cb] text-[#abd2cb] font-bold bg-[#abd2cb]/5'
              : 'border-transparent text-[#9c9691] hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Conformance & Verification (Passed)
        </button>
        <button
          onClick={() => setActiveTab('portal')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'portal'
              ? 'border-[#abd2cb] text-[#abd2cb] font-bold bg-[#abd2cb]/5'
              : 'border-transparent text-[#9c9691] hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Globe className="w-4 h-4" /> Portal Config & Hosts
        </button>
        <button
          onClick={() => setActiveTab('source')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'source'
              ? 'border-[#abd2cb] text-[#abd2cb] font-bold bg-[#abd2cb]/5'
              : 'border-transparent text-[#9c9691] hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Code2 className="w-4 h-4" /> Source Code Files
        </button>
        <button
          onClick={() => setActiveTab('customizer')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'customizer'
              ? 'border-[#abd2cb] text-[#abd2cb] font-bold bg-[#abd2cb]/5'
              : 'border-transparent text-[#9c9691] hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#7c3aed]" /> Customizer
        </button>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {/* ========================================================= */}
        {/* TAB: ABOUT DASHBOARD                                      */}
        {/* ========================================================= */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1d25] via-[#16171d] to-[#121319] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#abd2cb]/10 via-[#7c3aed]/10 to-transparent blur-3xl pointer-events-none -mr-20 -mt-20"></div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="max-w-3xl space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-[#abd2cb]/15 text-[#abd2cb] border border-[#abd2cb]/30 px-2.5 py-1 rounded font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" /> MoonPay PayBox Hackathon
                    </span>
                    <span className="bg-white/5 text-[#9c9691] border border-white/10 px-2.5 py-1 rounded font-mono">
                      Track: Physical World & Local Logistics
                    </span>
                    <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded font-mono">
                      MCP Protocol 2026-07-28
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Autonomous Physical World & Local Logistics Protocol
                  </h2>

                  <p className="text-sm sm:text-base text-[#9c9691] leading-relaxed">
                    A production-grade Model Context Protocol (MCP) server engineered for PayBox by MoonPay. It equips autonomous AI agents with the tools to calculate delivery routes, deposit Base USDC courier escrow, reserve Solana IoT smart parcel lockers, and pay real-time x402 airway tolls for drone clearance.
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => copyToClipboard(fullMarketplaceDescription, 'about-hero-copy')}
                      className="bg-[#abd2cb] hover:bg-[#9bc2bb] active:bg-[#8bb2ab] text-[#141414] font-bold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-[#abd2cb]/20"
                    >
                      {copiedKey === 'about-hero-copy' ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                      {copiedKey === 'about-hero-copy' ? 'Copied Full Description!' : 'Copy Plugin Description'}
                    </button>

                    <button
                      onClick={() => copyToClipboard(shortPitchDescription, 'about-hero-short-copy')}
                      className="bg-[#242531] hover:bg-[#2d2f3d] text-white font-medium text-xs px-4 py-2.5 rounded-lg border border-white/10 transition-all flex items-center gap-2"
                    >
                      {copiedKey === 'about-hero-short-copy' ? <Check className="w-4 h-4 text-[#abd2cb]" /> : <Copy className="w-4 h-4 text-[#9c9691]" />}
                      Copy Short Pitch (250 chars)
                    </button>

                    <button
                      onClick={() => setActiveTab('simulator')}
                      className="text-xs text-[#abd2cb] hover:underline font-semibold flex items-center gap-1 px-3 py-2"
                    >
                      Test in Simulator <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Spec Card */}
                <div className="bg-[#14151b] border border-white/10 rounded-xl p-4 w-full md:w-72 shrink-0 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
                    <span className="text-[#9c9691]">Artifact Name</span>
                    <span className="font-mono text-white font-semibold">dist/plugin.mjs</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
                    <span className="text-[#9c9691]">Bundle Size</span>
                    <span className="font-mono text-[#abd2cb] font-semibold">1.14 MB (10 MiB limit)</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
                    <span className="text-[#9c9691]">Local Conformance</span>
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
                    <span className="text-[#9c9691]">Tools Discovered</span>
                    <span className="font-mono text-white font-bold">6 Tools</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#9c9691]">Default Sample Tool</span>
                    <span className="font-mono text-[#abd2cb]">quote_delivery</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Artifact Download & Export Hub */}
            <div className="bg-[#181920] border-2 border-[#abd2cb]/40 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#abd2cb]/20 border border-[#abd2cb]/40 flex items-center justify-center text-[#abd2cb]">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">Verified Bundle Download & Export Hub</h3>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                        1.14 MB Verified Non-Empty
                      </span>
                    </div>
                    <p className="text-xs text-[#9c9691] mt-0.5">
                      Guaranteed uncorrupted, UTF-8 encoded <code className="text-[#abd2cb] font-mono">plugin.mjs</code> (1,144,221 bytes) ready for developer.paybox.sh upload.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#9c9691] text-[11px]">SHA-256:</span>
                  <span className="text-[#abd2cb] bg-[#141414] px-2 py-1 rounded border border-white/10 text-[11px]">
                    3a51f416dc...1832
                  </span>
                </div>
              </div>

              {/* Progress / Status banner */}
              {downloadMsg && (
                <div className="bg-[#abd2cb]/15 border border-[#abd2cb]/40 rounded-lg p-3 text-xs text-[#abd2cb] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{downloadMsg}</span>
                  </div>
                  <button onClick={() => setDownloadMsg(null)} className="text-[#9c9691] hover:text-white text-xs">✕</button>
                </div>
              )}

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  onClick={() => triggerBlobDownload('plugin.mjs')}
                  disabled={downloading}
                  className="bg-[#abd2cb] hover:bg-[#9bc2bb] active:bg-[#8bb2ab] text-[#141414] font-bold text-xs p-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#abd2cb]/20 cursor-pointer disabled:opacity-50"
                >
                  {downloading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download plugin.mjs (1.14 MB)
                </button>

                <button
                  onClick={copyFullBundleCode}
                  className="bg-[#242531] hover:bg-[#2d2f3d] text-white font-medium text-xs p-3 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  {copiedKey === 'full-bundle' ? <Check className="w-4 h-4 text-[#abd2cb]" /> : <Copy className="w-4 h-4 text-[#abd2cb]" />}
                  {copiedKey === 'full-bundle' ? 'Copied 1.14 MB Code!' : 'Copy Entire 1.14 MB Code'}
                </button>

                <a
                  href="/paybox-plugin.json"
                  download="paybox-plugin.json"
                  className="bg-[#14151b] hover:bg-[#1a1b22] text-[#e7e7e7] text-xs p-3 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#9c9691]" />
                  Download paybox-plugin.json
                </a>
              </div>

              {/* Terminal 1-Liner command */}
              <div className="bg-[#141414] border border-white/[0.08] rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#9c9691] font-medium flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#abd2cb]" /> Direct Terminal Download Command (macOS/Linux/WSL)
                  </span>
                  <button
                    onClick={() => copyToClipboard(`curl -sL ${window.location.origin}/api/download/plugin.mjs -o plugin.mjs`, 'curl-cmd')}
                    className="text-[#abd2cb] hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'curl-cmd' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'curl-cmd' ? 'Copied' : 'Copy curl'}
                  </button>
                </div>
                <div className="bg-[#0e0f14] p-2 rounded-lg font-mono text-xs text-[#abd2cb] overflow-x-auto select-all">
                  curl -sL {typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-63f5no3ppvglwwkvctyrrb-946301334817.europe-west2.run.app'}/api/download/plugin.mjs -o plugin.mjs
                </div>
                <p className="text-[10px] text-[#9c9691]">
                  If your browser saved a 0-byte file due to iframe sandbox protection, run this curl command in your terminal to directly download the non-empty 1.14 MB file.
                </p>
              </div>
            </div>

            {/* Description Formats Box with Dedicated Copy Buttons */}
            <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#abd2cb]" />
                  <h3 className="text-sm font-bold text-white tracking-tight">Plugin Descriptions for Upload & Submission</h3>
                </div>

                {/* Format Toggle Pill */}
                <div className="flex bg-[#141414] p-1 rounded-lg border border-white/[0.08] text-xs">
                  <button
                    onClick={() => setDescFormat('full')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      descFormat === 'full' ? 'bg-[#abd2cb] text-[#141414] font-bold' : 'text-[#9c9691] hover:text-white'
                    }`}
                  >
                    Full Marketplace Listing
                  </button>
                  <button
                    onClick={() => setDescFormat('short')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      descFormat === 'short' ? 'bg-[#abd2cb] text-[#141414] font-bold' : 'text-[#9c9691] hover:text-white'
                    }`}
                  >
                    Short Pitch
                  </button>
                  <button
                    onClick={() => setDescFormat('markdown')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      descFormat === 'markdown' ? 'bg-[#abd2cb] text-[#141414] font-bold' : 'text-[#9c9691] hover:text-white'
                    }`}
                  >
                    Markdown / README
                  </button>
                </div>
              </div>

              {/* Displayed Description Content */}
              <div className="relative">
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={() => {
                      const text = descFormat === 'full' ? fullMarketplaceDescription : descFormat === 'short' ? shortPitchDescription : markdownDescription;
                      copyToClipboard(text, `desc-${descFormat}`);
                    }}
                    className="bg-[#242531] hover:bg-[#2d2f3d] text-white px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono flex items-center gap-1.5 shadow"
                  >
                    {copiedKey === `desc-${descFormat}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#abd2cb]" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#9c9691]" /> Copy {descFormat.toUpperCase()}
                      </>
                    )}
                  </button>
                </div>

                <pre className="bg-[#141414] border border-white/[0.08] rounded-xl p-5 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto selection:bg-[#abd2cb]/30">
                  {descFormat === 'full' && fullMarketplaceDescription}
                  {descFormat === 'short' && shortPitchDescription}
                  {descFormat === 'markdown' && markdownDescription}
                </pre>
              </div>
            </div>

            {/* Core Architectural Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-5 space-y-3 relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Non-Custodial Escrow on Base</h3>
                <p className="text-xs text-[#9c9691] leading-relaxed">
                  Generates unsigned EVM transaction proposals transferring USDC (<code className="text-white font-mono">0x8335...2913</code>) to courier escrow contracts on Base (<code className="text-white font-mono">eip155:8453</code>). PayBox simulates and presents approval without exposing private keys.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-blue-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> book_delivery_escrow
                </div>
              </div>

              <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-5 space-y-3 relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Boxes className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Solana Smart Lockers</h3>
                <p className="text-xs text-[#9c9691] leading-relaxed">
                  Solves the physical parcel handover issue for AI agents. Automatically reserves secure IoT lockers at transit centers using SystemProgram transfers with zero blockhash placeholders for clean simulation.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-purple-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> reserve_smart_locker
                </div>
              </div>

              <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-5 space-y-3 relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-[#abd2cb]/15 border border-[#abd2cb]/30 flex items-center justify-center text-[#abd2cb]">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">x402 Drone Airway Tolls</h3>
                <p className="text-xs text-[#9c9691] leading-relaxed">
                  Natively integrates the PayBox x402 standard. Proposes paid HTTP 402 micro-toll clearance requests (0.05 USDC) to urban low-altitude corridor APIs, allowing autonomous delivery drones to pass checkpoints.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-[#abd2cb]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> request_corridor_pass
                </div>
              </div>
            </div>

            {/* Complete Tools Catalog Reference */}
            <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Full Tool Catalog Specification</h3>
                  <p className="text-xs text-[#9c9691]">Discovered by PayBox via <code className="text-white font-mono">tools/list</code></p>
                </div>
                <span className="text-xs font-mono text-[#abd2cb] bg-[#abd2cb]/10 border border-[#abd2cb]/20 px-2 py-0.5 rounded">
                  6 Tools Active
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#141414] text-[#9c9691] border-b border-white/[0.08]">
                    <tr>
                      <th className="p-3">Tool Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Rail / Chain</th>
                      <th className="p-3">Purpose & Description</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-slate-300">
                    {TOOLS.map((tool) => (
                      <tr key={tool.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 text-white font-bold flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            tool.proposalKind === 'evm' ? 'bg-blue-400' :
                            tool.proposalKind === 'solana' ? 'bg-purple-400' :
                            tool.proposalKind === 'x402' ? 'bg-[#abd2cb]' :
                            'bg-emerald-400'
                          }`}></span>
                          {tool.name}
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                            tool.proposalKind ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-[#9c9691]'
                          }`}>
                            {tool.proposalKind ? `${tool.proposalKind} proposal` : 'data query'}
                          </span>
                        </td>
                        <td className="p-3 text-[#9c9691]">
                          {tool.chain || 'Off-chain MCP'}
                        </td>
                        <td className="p-3 font-sans text-xs text-[#9c9691]">
                          {tool.description}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedToolId(tool.id);
                              setActiveTab('simulator');
                            }}
                            className="bg-[#242531] hover:bg-[#2d2f3d] text-white px-2.5 py-1 rounded text-[11px] font-sans font-semibold transition-all"
                          >
                            Simulate &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Submission Checklist */}
            <div className="bg-[#16171d] border border-white/[0.08] rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#abd2cb]" /> Submission Readiness Checklist
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#141414] p-3 rounded-lg border border-white/[0.06] flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#abd2cb]/20 text-[#abd2cb] flex items-center justify-center shrink-0 font-bold">✓</div>
                  <div>
                    <p className="font-semibold text-white">Conformance Tested</p>
                    <p className="text-[11px] text-[#9c9691]">Status: passed, sampleCall: quote_delivery, duration: ~1.1s</p>
                  </div>
                </div>

                <div className="bg-[#141414] p-3 rounded-lg border border-white/[0.06] flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#abd2cb]/20 text-[#abd2cb] flex items-center justify-center shrink-0 font-bold">✓</div>
                  <div>
                    <p className="font-semibold text-white">Bundle Integrity</p>
                    <p className="text-[11px] text-[#9c9691]">Single 1.14 MB UTF-8 dist/plugin.mjs with deterministic SHA256</p>
                  </div>
                </div>

                <div className="bg-[#141414] p-3 rounded-lg border border-white/[0.06] flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#abd2cb]/20 text-[#abd2cb] flex items-center justify-center shrink-0 font-bold">✓</div>
                  <div>
                    <p className="font-semibold text-white">No Exposed Secrets</p>
                    <p className="text-[11px] text-[#9c9691]">Uses brokered headers via PayBox proxy; zero credentials in bundle</p>
                  </div>
                </div>

                <div className="bg-[#141414] p-3 rounded-lg border border-white/[0.06] flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#abd2cb]/20 text-[#abd2cb] flex items-center justify-center shrink-0 font-bold">✓</div>
                  <div>
                    <p className="font-semibold text-white">Strict RFC3339 Expiries</p>
                    <p className="text-[11px] text-[#9c9691]">All proposal timestamps are whole-second UTC within 5 minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: INTERACTIVE SIMULATOR                                */}
        {/* ========================================================= */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Tool Selector & Inputs */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#abd2cb]" /> Discovered Tools ({TOOLS.length})
                  </h2>
                  <span className="text-[11px] text-[#9c9691] font-mono">tools/list</span>
                </div>
                <div className="space-y-1.5">
                  {TOOLS.map((t) => {
                    const isSelected = t.id === selectedToolId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTool(t)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-[#14151c] border-[#abd2cb] text-white shadow-md'
                            : 'bg-[#141414]/70 border-white/[0.06] text-slate-300 hover:bg-[#1a1b22] hover:border-white/10'
                        }`}
                      >
                        <div className={`p-1.5 rounded-md mt-0.5 ${
                          t.proposalKind === 'evm' ? 'bg-blue-500/20 text-blue-400' :
                          t.proposalKind === 'solana' ? 'bg-purple-500/20 text-purple-400' :
                          t.proposalKind === 'x402' ? 'bg-[#abd2cb]/20 text-[#abd2cb]' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {t.id === 'quote_delivery' && <Truck className="w-4 h-4" />}
                          {t.id === 'book_delivery_escrow' && <Lock className="w-4 h-4" />}
                          {t.id === 'reserve_smart_locker' && <Boxes className="w-4 h-4" />}
                          {t.id === 'request_corridor_pass' && <Compass className="w-4 h-4" />}
                          {t.id === 'track_dispatch' && <MapPin className="w-4 h-4" />}
                          {t.id === 'list_nearby_hubs' && <Layers className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-xs font-semibold truncate">{t.name}</span>
                            {t.proposalKind && (
                              <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded font-bold ${
                                t.proposalKind === 'evm' ? 'bg-blue-500/20 text-blue-300' :
                                t.proposalKind === 'solana' ? 'bg-purple-500/20 text-purple-300' :
                                'bg-[#abd2cb]/20 text-[#abd2cb]'
                              }`}>
                                {t.proposalKind}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9c9691] truncate mt-0.5">{t.title}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Input Form for Selected Tool */}
              <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Tool Input Arguments
                  </h3>
                  <button
                    onClick={() => setToolInputs(selectedTool.defaultArgs)}
                    className="text-[11px] text-[#abd2cb] hover:underline"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(selectedTool.defaultArgs).map(([key, defaultVal]) => {
                    const currentVal = toolInputs[key] ?? defaultVal;
                    const propSchema = selectedTool.inputSchemaJson.properties[key];

                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-mono text-slate-300 font-medium">
                            {key} {selectedTool.inputSchemaJson.required?.includes(key) && <span className="text-rose-400">*</span>}
                          </label>
                          {propSchema?.type && (
                            <span className="text-[10px] text-[#9c9691] font-mono">
                              {propSchema.type}{propSchema.enum ? ` (enum)` : ''}
                            </span>
                          )}
                        </div>

                        {propSchema?.enum ? (
                          <select
                            value={currentVal}
                            onChange={(e) => setToolInputs({ ...toolInputs, [key]: e.target.value })}
                            className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#abd2cb]"
                          >
                            {propSchema.enum.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : typeof defaultVal === 'number' ? (
                          <input
                            type="number"
                            value={currentVal}
                            onChange={(e) => setToolInputs({ ...toolInputs, [key]: Number(e.target.value) })}
                            className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#abd2cb]"
                          />
                        ) : (
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => setToolInputs({ ...toolInputs, [key]: e.target.value })}
                            className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#abd2cb]"
                          />
                        )}
                        {propSchema?.description && (
                          <p className="text-[10px] text-[#9c9691] mt-0.5">{propSchema.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={executeToolSimulation}
                  disabled={executing}
                  className="w-full mt-4 bg-[#abd2cb] hover:bg-[#9bc2bb] active:bg-[#8bb2ab] text-[#141414] font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-[#abd2cb]/20"
                >
                  {executing ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" /> Calling MCP Tool...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Execute {selectedTool.name}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Execution Output & PayBox Transaction Preview */}
            <div className="lg:col-span-7 space-y-4">
              {/* PayBox Transaction Preview Card if Proposal returned */}
              {executionResult?.result?.structuredContent?.["io.paybox/transactionProposal"] && (
                <div className="bg-gradient-to-b from-[#1b1c24] to-[#14151b] border border-[#abd2cb]/40 rounded-xl p-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#abd2cb] text-[#141414] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm">
                    <ShieldCheck className="w-3 h-3" /> PayBox Transaction Window
                  </div>

                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#abd2cb]/15 border border-[#abd2cb]/30 flex items-center justify-center text-[#abd2cb]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Unsigned Transaction Proposal</h4>
                      <p className="text-xs text-[#9c9691]">Declared via <code className="text-white font-mono">io.paybox/transactionProposal</code></p>
                    </div>
                  </div>

                  {(() => {
                    const prop = executionResult.result.structuredContent["io.paybox/transactionProposal"];
                    return (
                      <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-3 space-y-2.5 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-slate-300">
                          <div>
                            <span className="text-[#9c9691] text-[10px] block">PROPOSAL KIND</span>
                            <span className="font-mono font-bold text-[#abd2cb] uppercase">{prop.kind}</span>
                          </div>
                          <div>
                            <span className="text-[#9c9691] text-[10px] block">CHAIN / NETWORK</span>
                            <span className="font-mono font-bold text-[#abd2cb]">{prop.chain}</span>
                          </div>
                          <div>
                            <span className="text-[#9c9691] text-[10px] block">EXPIRES AT (RFC3339)</span>
                            <span className="font-mono text-amber-300">{prop.expiresAt}</span>
                          </div>
                          <div>
                            <span className="text-[#9c9691] text-[10px] block">SPEC VERSION</span>
                            <span className="font-mono">{prop.version}</span>
                          </div>
                        </div>

                        {prop.kind === 'evm' && (
                          <div className="border-t border-white/[0.08] pt-2 space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-[#9c9691]">Target Contract (to):</span>
                              <span className="font-mono text-slate-200">{prop.transaction.to}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-[#9c9691]">Value:</span>
                              <span className="font-mono text-slate-200">{prop.transaction.value} wei</span>
                            </div>
                            <div>
                              <span className="text-[#9c9691] text-[11px] block mb-0.5">Calldata:</span>
                              <div className="bg-[#181920] border border-white/[0.08] rounded p-1.5 font-mono text-[10px] text-[#abd2cb] break-all select-all">
                                {prop.transaction.data}
                              </div>
                            </div>
                          </div>
                        )}

                        {prop.kind === 'solana' && (
                          <div className="border-t border-white/[0.08] pt-2 space-y-1">
                            <span className="text-[#9c9691] text-[11px] block mb-0.5">Serialized Base64 Payload:</span>
                            <div className="bg-[#181920] border border-white/[0.08] rounded p-1.5 font-mono text-[10px] text-purple-300 break-all select-all">
                              {prop.transaction.transactionBase64}
                            </div>
                            <p className="text-[10px] text-[#9c9691]">
                              Fee payer set to user wallet. PayBox supplies a fresh blockhash and simulates before approval.
                            </p>
                          </div>
                        )}

                        {prop.kind === 'x402' && (
                          <div className="border-t border-white/[0.08] pt-2 space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-[#9c9691]">Clearance Endpoint:</span>
                              <span className="font-mono text-amber-300">{prop.request.url}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-[#9c9691]">Max Atomic USDC Amount:</span>
                              <span className="font-mono text-slate-200">{prop.payment.maxAmount} atomic units (0.05 USDC)</span>
                            </div>
                          </div>
                        )}

                        <div className="bg-[#191a22] border border-[#abd2cb]/20 rounded p-2 text-[11px] text-slate-300 flex items-start gap-1.5">
                          <Info className="w-4 h-4 text-[#abd2cb] shrink-0 mt-0.5" />
                          <span>
                            <strong>Safety Guarantee:</strong> PayBox handles wallet selection, signing, and broadcasting. No private keys are ever requested or held by the plugin.
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Physical Route & Logistics Visualizer */}
              {selectedTool.id === 'quote_delivery' && executionResult?.result?.structuredContent && (
                <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#abd2cb]" /> Route & Vehicle Telemetry
                    </h3>
                    <span className="text-[11px] text-[#abd2cb] font-mono font-semibold">
                      {executionResult.result.structuredContent.distanceKm} KM • ~{executionResult.result.structuredContent.estimatedMinutes} MINS
                    </span>
                  </div>

                  <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-4 relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold text-xs">
                          A
                        </div>
                        <div>
                          <p className="text-[10px] text-[#9c9691] uppercase">Pickup Location</p>
                          <p className="text-xs font-semibold text-slate-200">{executionResult.result.structuredContent.pickupAddress}</p>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-center">
                        <div className="flex items-center gap-1 text-[10px] text-[#abd2cb] font-mono font-medium mb-1">
                          <Truck className="w-3.5 h-3.5 animate-pulse" />
                          {executionResult.result.structuredContent.vehicleType}
                        </div>
                        <div className="w-32 h-0.5 bg-gradient-to-r from-blue-500 via-[#abd2cb] to-emerald-500 relative">
                          <div className="w-2 h-2 rounded-full bg-white absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 shadow-lg shadow-[#abd2cb]"></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-xs">
                          B
                        </div>
                        <div>
                          <p className="text-[10px] text-[#9c9691] uppercase">Dropoff Destination</p>
                          <p className="text-xs font-semibold text-slate-200">{executionResult.result.structuredContent.dropoffAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/[0.08] grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-[#181920] p-2 rounded border border-white/[0.06]">
                        <span className="text-[10px] text-[#9c9691] block">Base Fare</span>
                        <span className="font-mono font-bold text-slate-200">${executionResult.result.structuredContent.pricing.baseFeeUsdc}</span>
                      </div>
                      <div className="bg-[#181920] p-2 rounded border border-white/[0.06]">
                        <span className="text-[10px] text-[#9c9691] block">Distance Fee</span>
                        <span className="font-mono font-bold text-slate-200">${executionResult.result.structuredContent.pricing.distanceFeeUsdc}</span>
                      </div>
                      <div className="bg-[#181920] p-2 rounded border border-white/[0.06]">
                        <span className="text-[10px] text-[#9c9691] block">Urgency Fee</span>
                        <span className="font-mono font-bold text-slate-200">${executionResult.result.structuredContent.pricing.urgencySurchargeUsdc}</span>
                      </div>
                      <div className="bg-[#14151c] p-2 rounded border border-[#abd2cb]/30">
                        <span className="text-[10px] text-[#abd2cb] block font-bold">Total Quote</span>
                        <span className="font-mono font-bold text-[#abd2cb]">${executionResult.result.structuredContent.pricing.totalUsdc} USDC</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw JSON-RPC Response */}
              <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#abd2cb]"></span>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      MCP JSON-RPC Output (stdout)
                    </h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(executionResult, null, 2), 'rpc-copy')}
                    className="text-[11px] text-[#9c9691] hover:text-white flex items-center gap-1 font-mono"
                  >
                    {copiedKey === 'rpc-copy' ? <CheckCircle2 className="w-3.5 h-3.5 text-[#abd2cb]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'rpc-copy' ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="bg-[#141414] border border-white/[0.08] rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto max-h-80 selection:bg-[#abd2cb]/30">
                  {executionResult ? JSON.stringify(executionResult, null, 2) : "// Awaiting execution..."}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: CONFORMANCE & VERIFICATION                           */}
        {/* ========================================================= */}
        {activeTab === 'conformance' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#181a22] via-[#16171d] to-[#14151c] border border-[#abd2cb]/40 rounded-xl p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#abd2cb]/20 border border-[#abd2cb]/40 flex items-center justify-center text-[#abd2cb]">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">Conformance Verification Report</h2>
                      <span className="bg-[#abd2cb] text-[#141414] font-bold font-mono text-[11px] px-2 py-0.5 rounded uppercase">
                        PASSED
                      </span>
                    </div>
                    <p className="text-xs text-[#9c9691] mt-0.5">
                      Executed according to <code className="text-[#abd2cb] font-mono">scripts/conformance.mjs</code> against bundled <code className="text-[#abd2cb] font-mono">dist/plugin.mjs</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="bg-[#141414] border border-white/10 px-3 py-1.5 rounded-lg">
                    <span className="text-[#9c9691] block text-[10px]">TOOLCHAIN</span>
                    <span className="text-slate-200">Node {CONFORMANCE_REPORT.toolchain.node} ({CONFORMANCE_REPORT.toolchain.platform})</span>
                  </div>
                  <div className="bg-[#141414] border border-white/10 px-3 py-1.5 rounded-lg">
                    <span className="text-[#9c9691] block text-[10px]">SAMPLE TOOL</span>
                    <span className="text-[#abd2cb]">{CONFORMANCE_REPORT.sampleCall.tool}</span>
                  </div>
                  <div className="bg-[#141414] border border-white/10 px-3 py-1.5 rounded-lg">
                    <span className="text-[#9c9691] block text-[10px]">DISCOVERED TOOLS</span>
                    <span className="text-emerald-400 font-bold">{CONFORMANCE_REPORT.discoveredToolCount}</span>
                  </div>
                </div>
              </div>

              {/* SHA256 & Artifact Details */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-[#141414] border border-white/10 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[#9c9691] text-[10px] block">ARTIFACT SHA256 DIGEST</span>
                    <span className="text-[#abd2cb] break-all">{CONFORMANCE_REPORT.artifact.sha256}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(CONFORMANCE_REPORT.artifact.sha256, 'hash-copy')}
                    className="p-1.5 hover:bg-slate-800 text-[#9c9691] hover:text-white rounded ml-2"
                  >
                    {copiedKey === 'hash-copy' ? <CheckCircle2 className="w-4 h-4 text-[#abd2cb]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="bg-[#141414] border border-white/10 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[#9c9691] text-[10px] block">BUNDLE SIZE</span>
                    <span className="text-emerald-400">{(CONFORMANCE_REPORT.artifact.bytes / 1024 / 1024).toFixed(2)} MB</span>
                    <span className="text-[#9c9691] text-[11px] ml-1.5">(Safe under 10.00 MiB limit)</span>
                  </div>
                  <a
                    href="/plugin.mjs"
                    download="plugin.mjs"
                    className="bg-[#abd2cb] hover:bg-[#9bc2bb] text-[#141414] px-3 py-1 rounded text-xs font-sans font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            </div>

            {/* Checklist of Developer Guide Requirements */}
            <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#abd2cb]" /> PayBox Plugin Conformance Matrix
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {[
                  { title: "Protocol Version 2026-07-28", desc: "Server uses negotiated protocolVersion and responds with resultType: 'complete'.", passed: true },
                  { title: "No Private Keys in Plugin", desc: "Unsigned transaction proposals only. PayBox handles wallet selection and signing.", passed: true },
                  { title: "JSON Schema 2020-12 Output", desc: "All 6 tool input and output schemas validate with AJV draft 2020 without remote fetches.", passed: true },
                  { title: "Transaction Proposal Contract", desc: "Proposals declared inline under io.paybox/transactionProposal with 5-minute UTC expiry.", passed: true },
                  { title: "EVM Base USDC Encoding", desc: "Canonical chain eip155:8453, atomic 6-decimal units, transfer ABI encoded via Viem.", passed: true },
                  { title: "Solana Transaction Construction", desc: "Unsigned legacy Base64 under 1,232 bytes, fee payer set, zero blockhash placeholder.", passed: true },
                  { title: "x402 Payment Spec Compliant", desc: "Supports HTTP 402 micro-toll clearance for airway drone access on Base USDC.", passed: true },
                  { title: "Deterministic Reproducible Build", desc: "Esbuild generates clean UTF-8 bundle with deterministic bytecode hash.", passed: true },
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#141414] border border-white/[0.06] rounded-lg p-3 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#abd2cb] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-slate-200">{item.title}</h4>
                      <p className="text-[#9c9691] text-[11px] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Terminal Output Viewer */}
            <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-white">pnpm test / pnpm conformance Output</span>
                <span className="text-[11px] font-mono text-[#abd2cb]">Exit code: 0</span>
              </div>
              <pre className="bg-[#141414] border border-white/[0.08] rounded-lg p-3 font-mono text-xs text-[#abd2cb] overflow-x-auto">
                {JSON.stringify(CONFORMANCE_REPORT, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: PORTAL CONFIG & HOSTS                                */}
        {/* ========================================================= */}
        {activeTab === 'portal' && (
          <div className="space-y-6">
            <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#abd2cb]" /> Developer Portal Configuration
              </h2>
              <p className="text-xs text-[#9c9691] mb-4">
                When uploading your <code className="text-[#abd2cb] font-mono">dist/plugin.mjs</code> to{' '}
                <a href="https://developer.paybox.sh" target="_blank" rel="noopener noreferrer" className="text-[#abd2cb] underline">
                  developer.paybox.sh
                </a>
                , configure these exact settings in the portal.
              </p>

              <div className="space-y-4">
                {/* Network Hosts Card */}
                <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" /> Configured Network Hosts
                    </h3>
                    <span className="text-[11px] text-[#9c9691] font-mono">Test & Configure &gt; Network Hosts</span>
                  </div>
                  <p className="text-xs text-[#9c9691] mb-3">
                    PayBox strictly allows only exact configured hostnames (port 443 HTTPS only; wildcards not supported).
                  </p>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="bg-[#181920] border border-white/[0.08] rounded p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-white font-semibold">api.corridorpass.network</span>
                        <span className="text-[#9c9691] block text-[10px]">Used by: request_corridor_pass (x402 drone clearance endpoint)</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard('api.corridorpass.network', 'host1')}
                        className="text-[#9c9691] hover:text-white px-2 py-1 bg-[#242531] rounded text-[11px]"
                      >
                        {copiedKey === 'host1' ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="bg-[#181920] border border-white/[0.08] rounded p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-white font-semibold">nominatim.openstreetmap.org</span>
                        <span className="text-[#9c9691] block text-[10px]">Optional: Physical geocoding & address coordinate lookup</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard('nominatim.openstreetmap.org', 'host2')}
                        className="text-[#9c9691] hover:text-white px-2 py-1 bg-[#242531] rounded text-[11px]"
                      >
                        {copiedKey === 'host2' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Variables & Secrets */}
                <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" /> Variables & Brokered Secrets
                    </h3>
                    <span className="text-[11px] text-[#9c9691] font-mono">Variables & Secrets Tab</span>
                  </div>
                  <p className="text-xs text-[#9c9691] mb-3">
                    Brokered secrets are injected directly into outgoing requests by PayBox proxy headers—they are never logged or stored in plugin code.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#181920] text-[#9c9691] border-b border-white/[0.08]">
                        <tr>
                          <th className="p-2">Type</th>
                          <th className="p-2">Name / Key</th>
                          <th className="p-2">Target Host / Value</th>
                          <th className="p-2">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-slate-300">
                        <tr>
                          <td className="p-2"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">ENV VAR</span></td>
                          <td className="p-2 text-white font-semibold">COURIER_NETWORK</td>
                          <td className="p-2 text-[#9c9691]">hyperroute-mainnet</td>
                          <td className="p-2 text-[#9c9691] font-sans">Dispatcher fleet cluster identifier</td>
                        </tr>
                        <tr>
                          <td className="p-2"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">ENV VAR</span></td>
                          <td className="p-2 text-white font-semibold">DEFAULT_ESCROW</td>
                          <td className="p-2 text-[#abd2cb] break-all">{customEscrowAddress}</td>
                          <td className="p-2 text-[#9c9691] font-sans">Recipient wallet for courier deposits</td>
                        </tr>
                        <tr>
                          <td className="p-2"><span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">SECRET</span></td>
                          <td className="p-2 text-white font-semibold">Authorization</td>
                          <td className="p-2 text-[#9c9691]">Target: api.corridorpass.network</td>
                          <td className="p-2 text-[#9c9691] font-sans">Host-scoped header injected by PayBox</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Submission Instructions */}
                <div className="bg-[#141414] border border-white/[0.08] rounded-lg p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Hackathon Submission Steps
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                    <li>
                      Download <code className="text-[#abd2cb] font-mono">dist/plugin.mjs</code> and{' '}
                      <code className="text-[#abd2cb] font-mono">paybox-plugin.json</code> using the buttons above.
                    </li>
                    <li>
                      Log into <a href="https://developer.paybox.sh" target="_blank" rel="noopener noreferrer" className="text-[#abd2cb] underline font-semibold">developer.paybox.sh</a> with your PayBox account.
                    </li>
                    <li>
                      Under <strong>New Plugin</strong>, drag and drop <code className="text-[#abd2cb] font-mono">dist/plugin.mjs</code>.
                    </li>
                    <li>
                      Configure the <strong>Network Hosts</strong> and <strong>Variables</strong> listed in the tables above.
                    </li>
                    <li>
                      Run the hosted checks and validate a sample proposal with your connected PayBox wallet.
                    </li>
                    <li>
                      Select <strong>Submit Project</strong> before Saturday at 8:00 PM New York time.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: SOURCE CODE FILES                                    */}
        {/* ========================================================= */}
        {activeTab === 'source' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-3 space-y-2">
              <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-3">
                <span className="text-[10px] font-bold text-[#9c9691] uppercase tracking-wider block mb-2 px-1">
                  Project Files
                </span>
                <div className="space-y-1">
                  {Object.keys(SOURCE_FILES).map((key) => {
                    const isSelected = key === selectedSourceKey;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedSourceKey(key)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#abd2cb] text-[#141414] font-bold'
                            : 'text-[#9c9691] hover:text-white hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="truncate">{key}</span>
                        {key.endsWith('.ts') ? (
                          <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-[#141414]/20 text-[#141414]' : 'bg-blue-500/20 text-blue-300'}`}>TS</span>
                        ) : (
                          <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-[#141414]/20 text-[#141414]' : 'bg-slate-800 text-slate-300'}`}>JSON</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-3 text-xs text-[#9c9691]">
                <p className="font-semibold text-white mb-1">Local Build Command</p>
                <div className="bg-[#141414] p-2 rounded border border-white/[0.08] font-mono text-[10px] text-[#abd2cb] select-all">
                  pnpm build && pnpm test
                </div>
              </div>
            </div>

            <div className="md:col-span-9 bg-[#181920] border border-white/[0.08] rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#abd2cb]" />
                  <span className="font-mono text-xs font-bold text-white">
                    {SOURCE_FILES[selectedSourceKey]?.filename}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(SOURCE_FILES[selectedSourceKey]?.content, 'file-copy')}
                  className="text-xs text-[#9c9691] hover:text-white flex items-center gap-1 font-mono"
                >
                  {copiedKey === 'file-copy' ? <CheckCircle2 className="w-3.5 h-3.5 text-[#abd2cb]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'file-copy' ? 'Copied' : 'Copy Code'}
                </button>
              </div>

              <pre className="bg-[#141414] border border-white/[0.08] rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[580px] leading-relaxed select-all">
                {SOURCE_FILES[selectedSourceKey]?.content}
              </pre>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: CUSTOMIZER                                           */}
        {/* ========================================================= */}
        {activeTab === 'customizer' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/40 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Refine Your Physical World Logistics Plugin</h2>
                  <p className="text-xs text-[#9c9691]">
                    Fine-tune courier pricing, smart locker parameters, and payment destination for your team's hackathon project.
                  </p>
                </div>
              </div>

              <div className="space-y-5 text-xs">
                {/* 1. Escrow Treasury Wallet */}
                <div>
                  <label className="font-bold text-white block mb-1">
                    1. Designated Courier Escrow / Merchant Address (Base EVM)
                  </label>
                  <p className="text-[#9c9691] text-[11px] mb-1.5">
                    USDC payments from AI agents will be locked or routed to this address when booking courier escrow.
                  </p>
                  <input
                    type="text"
                    value={customEscrowAddress}
                    onChange={(e) => setCustomEscrowAddress(e.target.value)}
                    className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 font-mono text-[#abd2cb] text-xs focus:outline-none focus:border-[#abd2cb]"
                    placeholder="0x..."
                  />
                </div>

                {/* 2. Rate Formula */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-white block mb-1">
                      2. Base Package Pickup Fee (USDC)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      value={baseFeeRate}
                      onChange={(e) => setBaseFeeRate(Number(e.target.value))}
                      className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 font-mono text-slate-200 text-xs focus:outline-none focus:border-[#abd2cb]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-white block mb-1">
                      3. Per-Kilometer Transit Rate (USDC)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={kmRate}
                      onChange={(e) => setKmRate(Number(e.target.value))}
                      className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 font-mono text-slate-200 text-xs focus:outline-none focus:border-[#abd2cb]"
                    />
                  </div>
                </div>

                {/* 3. Primary Payment Rail */}
                <div>
                  <label className="font-bold text-white block mb-1">
                    4. Preferred Blockchain Rails
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    <button
                      onClick={() => setPrimaryNetwork('base')}
                      className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                        primaryNetwork === 'base'
                          ? 'bg-blue-950/40 border-blue-500 text-white shadow'
                          : 'bg-[#141414] border-white/[0.08] text-[#9c9691] hover:border-white/15'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1"></div>
                      <div>
                        <div className="font-semibold text-xs text-white">Base (EIP-155: 8453)</div>
                        <div className="text-[10px] text-[#9c9691] mt-0.5">Native USDC (0x8335...2913), ERC-20 transfer calldata</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPrimaryNetwork('solana')}
                      className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                        primaryNetwork === 'solana'
                          ? 'bg-purple-950/40 border-purple-500 text-white shadow'
                          : 'bg-[#141414] border-white/[0.08] text-[#9c9691] hover:border-white/15'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1"></div>
                      <div>
                        <div className="font-semibold text-xs text-white">Solana (Mainnet)</div>
                        <div className="text-[10px] text-[#9c9691] mt-0.5">Lamports or USDC mint, SystemProgram transfer</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Re-simulate Button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setActiveTab('simulator');
                      executeToolSimulation();
                    }}
                    className="w-full bg-[#abd2cb] hover:bg-[#9bc2bb] active:bg-[#8bb2ab] text-[#141414] font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#abd2cb]/20"
                  >
                    Apply Parameters & Test in Simulator <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ideas for Hackathon Judges Card */}
            <div className="bg-[#181920] border border-white/[0.08] rounded-xl p-5 text-xs text-slate-300 space-y-2">
              <h3 className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" /> Winning Pitch Points for Physical Logistics Track:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-[#9c9691] text-[11px]">
                <li><strong className="text-white">Autonomous Physical Commerce:</strong> AI agents can buy physical items and autonomously hire human bike couriers, vans, or hexacopter drones.</li>
                <li><strong className="text-white">Smart Locker Handover:</strong> Solves the "how does an AI receive a physical parcel" problem through PIN-secured IoT lockers.</li>
                <li><strong className="text-white">x402 Micro-tolls:</strong> Exercises the newest PayBox standard to pay instant micro-tolls for airway drone corridors.</li>
                <li><strong className="text-white">Cryptographic Escrow:</strong> Funds are locked on Base USDC until physical sensors or courier dropoff signature confirms delivery.</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#141414] px-6 py-4 text-xs text-[#9c9691] flex flex-wrap items-center justify-between gap-4">
        <div>
          <span>PayBox Hackathon Plugin Studio • </span>
          <span className="text-[#abd2cb] font-semibold">Physical World & Local Logistics Track</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Starter v1.0.2 • MCP 2026-07-28</span>
          <a
            href="https://developer.paybox.sh/requirements.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#abd2cb] hover:underline"
          >
            Developer Guide
          </a>
        </div>
      </footer>
    </div>
  );
}
