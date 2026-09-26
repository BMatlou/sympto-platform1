"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Activity, Bluetooth, ChevronLeft, HeartPulse, Link2Off, Watch } from "lucide-react";
import { api } from "@/lib/api";

const HEART_RATE_SERVICE = "heart_rate";
const HEART_RATE_CHARACTERISTIC = "heart_rate_measurement";

type BluetoothDeviceLike = {
  id: string;
  name?: string;
  gatt?: {
    connect: () => Promise<BluetoothRemoteGATTServerLike>;
    disconnect?: () => void;
  };
};

type BluetoothRemoteGATTServerLike = {
  getPrimaryService: (service: string) => Promise<BluetoothRemoteGATTServiceLike>;
};

type BluetoothRemoteGATTServiceLike = {
  getCharacteristic: (characteristic: string) => Promise<BluetoothRemoteGATTCharacteristicLike>;
};

type BluetoothRemoteGATTCharacteristicLike = {
  startNotifications: () => Promise<BluetoothRemoteGATTCharacteristicLike>;
  addEventListener: (event: string, listener: (event: { target?: { value?: DataView } }) => void) => void;
};

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: { filters: Array<{ services: string[] }> }) => Promise<BluetoothDeviceLike>;
  };
};

function parseHeartRate(data: DataView): number {
  const flags = data.getUint8(0);
  return flags & 0x01 ? data.getUint16(1, true) : data.getUint8(1);
}

export default function WearablesPage() {
  const [providers, setProviders] = useState<
    Array<{
      provider: string;
      name: string;
      connectionMode: string;
      status: string;
      note: string;
    }>
  >([]);
  const [devices, setDevices] = useState<
    Array<{
      id: string;
      manufacturer: string;
      model: string;
      status: string;
      lastSyncAt?: string | null;
      measurements?: Array<{
        measurementType: string;
        value: number | string;
        unit: string;
        measuredAt: string;
        source?: string | null;
      }>;
    }>
  >([]);
  const [connectedName, setConnectedName] = useState("");
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const deviceRef = useRef<BluetoothDeviceLike | null>(null);
  const backendDeviceIdRef = useRef<string | null>(null);

  const loadDevices = async () => {
    try {
      const response = await api.get("/patient-wearables");
      setDevices(response.data?.data ?? response.data ?? []);
    } catch {
      setDevices([]);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await api.get("/patient-wearables/providers");
      setProviders(response.data?.data ?? response.data ?? []);
    } catch {
      setProviders([]);
    }
  };

  useEffect(() => {
    void loadDevices();
    void loadProviders();
  }, []);

  const connect = async () => {
    setError("");
    setConnecting(true);
    try {
      const bluetooth = (navigator as BluetoothNavigator).bluetooth;
      if (!bluetooth) {
        throw new Error("Bluetooth is not available in this browser. Use a supported browser or the Sympto mobile app.");
      }

      const device = await bluetooth.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] });
      if (!device.gatt) throw new Error("This wearable does not expose a Bluetooth health connection.");

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HEART_RATE_SERVICE);
      const characteristic = await service.getCharacteristic(HEART_RATE_CHARACTERISTIC);
      await characteristic.startNotifications();

      const backendResponse = await api.post("/patient-wearables/connect", {
        manufacturer: "Bluetooth LE",
        model: device.name || "Heart-rate wearable",
        deviceType: "SMARTWATCH",
      });
      const backendDevice = backendResponse.data?.data ?? backendResponse.data;
      backendDeviceIdRef.current = backendDevice.id;
      deviceRef.current = device;
      setConnectedName(device.name || "Heart-rate wearable");
      setStatus("Connected · waiting for heart rate");

      characteristic.addEventListener("characteristicvaluechanged", async (event) => {
        const data = event.target?.value;
        if (!data || !backendDeviceIdRef.current) return;
        const bpm = parseHeartRate(data);
        setHeartRate(bpm);
        setStatus("Connected · receiving heart rate");
        try {
          await api.post(`/patient-wearables/${backendDeviceIdRef.current}/heart-rate`, {
            value: bpm,
            measuredAt: new Date().toISOString(),
          });
        } catch {
          // The live reading remains visible even if a single background sync fails.
        }
      });

      await loadDevices();
    } catch (caught) {
      setStatus("Not connected");
      setError(caught instanceof Error ? caught.message : "Could not connect to the wearable.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setError("");
    try {
      if (backendDeviceIdRef.current) {
        await api.delete(`/patient-wearables/${backendDeviceIdRef.current}`);
      }
      deviceRef.current?.gatt?.disconnect?.();
      setStatus("Disconnected");
      setConnectedName("");
      setHeartRate(null);
      backendDeviceIdRef.current = null;
      deviceRef.current = null;
      await loadDevices();
    } catch {
      setError("Could not disconnect the wearable.");
    }
  };

  const symptoProvider = providers.find((provider) => provider.provider === "SYMPTO_WEARABLE");
  const otherProviders = providers.filter((provider) => provider.provider !== "SYMPTO_WEARABLE");

  const symptoProvider = providers.find((provider) => provider.provider === "SYMPTO_WEARABLE");
  const otherProviders = providers.filter((provider) => provider.provider !== "SYMPTO_WEARABLE");
  const usingOtherSources = showSources;

  return (
    <main className="min-h-screen bg-[#F4FBFB] px-4 py-7 text-[#0b2d54] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-[#0b2d54]"
        >
          <ChevronLeft className="h-5 w-5" />
          Health Home
        </Link>

        <section className="mt-4 overflow-hidden rounded-[2rem] border border-[#dbe8eb] bg-white shadow-[0_24px_70px_rgba(11,45,84,0.08)]">
          <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#24c1c4]">Connected Health</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-[2.25rem]">Connect your wearable</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Keep your health, activity, sleep and recovery data connected to Sympto.
                </p>
              </div>

              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0b2d54] text-[#24c1c4] sm:flex">
                <Watch className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 flex justify-center sm:justify-start">
              <div className="relative inline-grid min-h-12 grid-cols-2 rounded-full bg-slate-100 p-1 shadow-inner">
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-[0_4px_12px_rgba(11,45,84,0.12)] transition-transform duration-300 ease-out ${
                    usingOtherSources ? "translate-x-full" : "translate-x-0"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSources(false)}
                  aria-pressed={!usingOtherSources}
                  className="relative z-10 min-w-[150px] rounded-full px-5 text-sm font-black text-[#0b2d54]"
                >
                  Sympto wearable
                </button>
                <button
                  type="button"
                  onClick={() => setShowSources(true)}
                  aria-pressed={usingOtherSources}
                  className="relative z-10 min-w-[150px] rounded-full px-5 text-sm font-black text-slate-500"
                >
                  Other wearables
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
            {!usingOtherSources ? (
              <>
                <div className="overflow-hidden rounded-[1.75rem] bg-[#0b2d54] text-white">
                  <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="p-6 sm:p-8">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex items-center rounded-full bg-[#24c1c4]/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#24c1c4]">
                            Sympto
                          </span>
                          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Sympto Wearable</h2>
                          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                            Designed around the health signals Sympto already understands — vitals, activity, exercise, sleep and recovery.
                          </p>
                        </div>

                        <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#24c1c4] sm:flex">
                          <Watch className="h-8 w-8" />
                        </div>
                      </div>

                      <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          ["Vitals", "Heart rate · oxygen"],
                          ["Activity", "Steps · movement"],
                          ["Sleep", "Sleep · recovery"],
                          ["Exercise", "Workouts · activity"],
                        ].map(([title, detail]) => (
                          <div key={title} className="rounded-2xl border border-white/10 bg-white/6 px-3.5 py-3.5">
                            <p className="text-xs font-black text-white">{title}</p>
                            <p className="mt-1 text-[10px] leading-4 text-white/45">{detail}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-7 flex flex-wrap items-center gap-2 text-xs font-bold text-white/55">
                        <span className="rounded-full bg-white/8 px-3 py-1.5">Watch</span>
                        <span className="rounded-full bg-white/8 px-3 py-1.5">Wristband</span>
                        <span className="rounded-full bg-[#24c1c4]/15 px-3 py-1.5 text-[#24c1c4]">Coming to Sympto</span>
                      </div>
                    </div>

                    <div className="border-t border-white/10 bg-white/[0.04] p-6 sm:p-8 lg:border-l lg:border-t-0">
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Sympto wearable</p>
                          <p className="mt-3 text-lg font-black">Made for everyday health tracking.</p>
                          <p className="mt-2 text-sm leading-6 text-white/55">
                            One simple connection for the health signals you follow in Sympto.
                          </p>
                        </div>

                        <div className="mt-7 rounded-2xl border border-white/10 bg-white/6 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#24c1c4] text-[#0b2d54]">
                              <Watch className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-white">Sympto Wearable</p>
                              <p className="text-xs text-white/45">Watch + wristband family</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-sm font-black text-[#0b2d54]">Already using another wearable?</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Keep it connected to Sympto too.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSources(true)}
                    className="shrink-0 rounded-full bg-white px-4 py-2.5 text-xs font-black text-[#0b2d54] shadow-sm ring-1 ring-slate-200 transition hover:ring-[#24c1c4]"
                  >
                    View wearables
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Other wearables</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Use the devices you already have.</h2>
                  </div>
                  <p className="max-w-md text-xs leading-5 text-slate-500 sm:text-right">
                    Supported health sources can share relevant data with your Sympto health record.
                  </p>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
                  <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b2d54] text-[#24c1c4]">
                        <Bluetooth className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0b2d54]">Bluetooth wearable</p>
                        <p className="text-xs text-slate-500">Connect a compatible heart-rate device.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Live heart rate</p>
                        <p className="mt-0.5 text-2xl font-black text-[#0b2d54]">
                          {heartRate ?? "—"} <span className="text-xs text-slate-400">bpm</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={connect}
                        disabled={connecting || status.startsWith("Connected")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0b2d54] px-4 text-xs font-black text-white transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Bluetooth className="h-4 w-4" />
                        {connecting ? "Connecting…" : "Connect"}
                      </button>
                      <button
                        type="button"
                        onClick={disconnect}
                        disabled={!backendDeviceIdRef.current}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b2d54] transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Disconnect wearable"
                      >
                        <Link2Off className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        status.startsWith("Connected")
                          ? "bg-[#24c1c4] shadow-[0_0_0_5px_rgba(36,193,196,0.12)]"
                          : "bg-slate-300"
                      }`} />
                      <p className="text-xs font-bold text-slate-500">
                        {connectedName ? connectedName : status === "Disconnected" ? "Disconnected" : "Not connected"}
                      </p>
                    </div>
                    {error && (
                      <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                </div>

                {otherProviders.length > 0 && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {otherProviders.map((provider) => {
                      const availableNow = provider.status === "AVAILABLE_NOW";
                      return (
                        <div
                          key={provider.provider}
                          className="flex min-h-[116px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#bfe8e9] hover:shadow-[0_12px_26px_rgba(11,45,84,0.06)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#0b2d54]">
                              <Watch className="h-5 w-5" />
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                                availableNow ? "bg-[#24c1c4]/12 text-[#0b2d54]" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {availableNow ? "Available" : "Coming soon"}
                            </span>
                          </div>
                          <p className="mt-4 text-sm font-black text-[#0b2d54]">{provider.name}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <div className="mt-8 border-t border-slate-100 pt-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Your devices</p>
                  <h2 className="mt-1 text-xl font-black text-[#0b2d54]">Connected devices</h2>
                </div>
                {devices.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    {devices.length}
                  </span>
                )}
              </div>

              {devices.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-5 py-6">
                  <p className="text-sm font-bold text-[#0b2d54]">Nothing connected yet.</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Connected devices will appear here.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {devices.map((device) => {
                    const latest = device.measurements?.[0];
                    const lastSync = device.lastSyncAt
                      ? new Intl.DateTimeFormat("en-ZA", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(device.lastSyncAt))
                      : null;

                    return (
                      <div
                        key={device.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b2d54] text-[#24c1c4]">
                            <Watch className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-black text-[#0b2d54]">{device.model}</p>
                            <p className="text-xs text-slate-500">{device.manufacturer}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {lastSync ? `Last sync ${lastSync}` : "Waiting for the first reading"}
                              {latest ? ` · Latest ${latest.value} ${latest.unit}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="self-start rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-black text-[#0b2d54] sm:self-auto">
                          {device.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
