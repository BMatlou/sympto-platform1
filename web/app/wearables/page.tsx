"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bluetooth, ChevronLeft, Link2Off, Watch } from "lucide-react";
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

  const otherProviders = providers.filter((provider) => provider.provider !== "SYMPTO_WEARABLE");

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

        <section className="mt-4 overflow-hidden rounded-[2rem] border border-[#dbe7ea] bg-white shadow-[0_24px_70px_rgba(11,45,84,0.08)]">
          <header className="flex flex-col gap-5 border-b border-slate-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#24c1c4]">Connected Health</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Wearables</h1>
            </div>

            <div className="flex items-center gap-3 self-start">
              <span className={`text-xs font-black ${showSources ? "text-slate-400" : "text-[#0b2d54]"}`}>Sympto</span>
              <button
                type="button"
                role="switch"
                aria-checked={showSources}
                aria-label={showSources ? "Show Sympto wearable" : "Show other wearables"}
                onClick={() => setShowSources((value) => !value)}
                className={`relative h-8 w-14 rounded-full p-1 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2 ${showSources ? "bg-slate-300" : "bg-[#24c1c4]"}`}
              >
                <span className={`block h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(11,45,84,0.22)] transition-transform duration-200 ${showSources ? "translate-x-6" : "translate-x-0"}`} />
              </button>
              <span className={`text-xs font-black ${showSources ? "text-[#0b2d54]" : "text-slate-400"}`}>Other</span>
            </div>
          </header>

          {!showSources ? (
            <div className="p-5 sm:p-7">
              <div className="overflow-hidden rounded-[2rem] bg-[#0b2d54]">
                <div className="grid min-h-[520px] lg:grid-cols-[1fr_1fr]">
                  <div className="relative flex items-center justify-center overflow-hidden bg-[#F1FBFB] p-8 sm:p-12">
                    <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#24c1c4]/15" />
                    <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#24c1c4]/10" />

                    <div className="relative h-[380px] w-[245px]">
                      <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-[2.5rem] bg-[#08213e] shadow-[0_26px_55px_rgba(11,45,84,0.24)]" />
                      <div className="absolute bottom-0 left-1/2 h-32 w-32 -translate-x-1/2 rounded-[2.5rem] bg-[#08213e] shadow-[0_26px_55px_rgba(11,45,84,0.24)]" />
                      <div className="absolute left-1/2 top-1/2 h-[270px] w-[205px] -translate-x-1/2 -translate-y-1/2 rounded-[4.2rem] bg-[#24c1c4] p-[10px] shadow-[0_30px_75px_rgba(11,45,84,0.24)]">
                        <div className="flex h-full w-full items-center justify-center rounded-[3.55rem] bg-[#071f3a]">
                          <div className="text-center">
                            <p className="text-2xl font-black tracking-tight text-white">Sympto</p>
                            <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#24c1c4]/55">
                              <div className="h-3 w-3 rounded-full bg-[#24c1c4]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between p-7 text-white sm:p-10">
                    <div>
                      <div className="inline-flex items-center rounded-full bg-[#24c1c4]/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]">
                        Sympto
                      </div>
                      <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Sympto Wearable</h2>
                      <p className="mt-2 text-sm font-medium text-white/50">Watch + Wristband</p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-2">
                        {["Vitals", "Activity", "Sleep", "Recovery"].map((item) => (
                          <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-white/70">
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Status</p>
                          <p className="mt-1 text-sm font-black text-white">Coming soon</p>
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-[#24c1c4] shadow-[0_0_0_5px_rgba(36,193,196,0.10)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {devices.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Connected devices</p>
                  <div className="mt-3 space-y-2">
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
                        <div key={device.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b2d54] text-[#24c1c4]">
                              <Watch className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-[#0b2d54]">{device.model}</p>
                              <p className="text-xs text-slate-500">{device.manufacturer}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-[#0b2d54]">{device.status}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {lastSync ? `Sync ${lastSync}` : "Waiting"}
                              {latest ? ` · ${latest.value} ${latest.unit}` : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xl font-black tracking-tight text-[#0b2d54]">Other wearables</p>
                    <p className="mt-1 text-xs text-slate-500">Connect a device you already use.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Bluetooth</p>
                      <p className="mt-1 text-lg font-black text-[#0b2d54]">{heartRate ?? "—"} <span className="text-xs text-slate-400">bpm</span></p>
                    </div>

                    <button
                      type="button"
                      onClick={connect}
                      disabled={connecting || status.startsWith("Connected")}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#0b2d54] px-4 text-xs font-black text-white transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Bluetooth className="h-4 w-4" />
                      {connecting ? "Connecting…" : "Connect"}
                    </button>

                    <button
                      type="button"
                      onClick={disconnect}
                      disabled={!backendDeviceIdRef.current}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b2d54] disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Disconnect"
                    >
                      <Link2Off className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
                {otherProviders.map((provider) => {
                  const availableNow = provider.status === "AVAILABLE_NOW";
                  return (
                    <div key={provider.provider} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#0b2d54]">
                          <Watch className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-black text-[#0b2d54]">{provider.name}</p>
                      </div>
                      <span className={`text-xs font-black ${availableNow ? "text-[#0b2d54]" : "text-slate-400"}`}>
                        {availableNow ? "Available" : "Coming soon"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
