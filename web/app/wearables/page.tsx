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

  const otherProviders = providers.filter((provider) => !["SYMPTO_WEARABLE", "BLUETOOTH_LE"].includes(provider.provider));

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
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="overflow-hidden rounded-[1.75rem] bg-[#0b2d54] text-white">
                  <div className="flex h-full flex-col justify-between p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#24c1c4]">Bluetooth</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight">Connect a device</h2>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">
                          Pair a compatible wearable and bring its live heart-rate data into Sympto.
                        </p>
                      </div>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#24c1c4]">
                        <Bluetooth className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="mt-8 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Live heart rate</p>
                        <p className="mt-1 text-5xl font-black tracking-tight">
                          {heartRate ?? "—"}<span className="ml-2 text-sm font-bold text-white/40">bpm</span>
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${status.startsWith("Connected") ? "bg-[#24c1c4] shadow-[0_0_0_5px_rgba(36,193,196,0.10)]" : "bg-white/25"}`} />
                          <span className="text-xs font-bold text-white/45">
                            {connectedName || (status === "Disconnected" ? "Disconnected" : "Not connected")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={connect}
                          disabled={connecting || status.startsWith("Connected")}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#24c1c4] px-5 text-xs font-black text-[#0b2d54] transition hover:bg-[#38d1d3] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Bluetooth className="h-4 w-4" />
                          {connecting ? "Connecting…" : "Connect"}
                        </button>

                        <button
                          type="button"
                          onClick={disconnect}
                          disabled={!backendDeviceIdRef.current}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Disconnect"
                        >
                          <Link2Off className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="mt-5 rounded-2xl bg-red-400/10 px-4 py-3 text-xs font-semibold leading-5 text-red-200" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-[#F7FBFC] p-6 sm:p-7">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Connected health</p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-[#0b2d54]">Use your existing devices</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Bring supported health data into the same Sympto experience.
                  </p>

                  <div className="mt-6 rounded-2xl border border-[#d9eeee] bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-[#0b2d54]">Apple Health</p>
                        <p className="mt-1 text-[11px] text-slate-400">iPhone + Apple Watch</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-500">Coming soon</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {otherProviders.map((provider) => {
                  const availableNow = provider.status === "AVAILABLE_NOW";
                  const initials = provider.name
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={provider.provider}
                      className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#b9e7e8] hover:shadow-[0_14px_32px_rgba(11,45,84,0.07)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1F7F8] text-sm font-black text-[#0b2d54]">
                          {initials}
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${availableNow ? "bg-[#24c1c4]/12 text-[#0b2d54]" : "bg-slate-100 text-slate-500"}`}>
                          {availableNow ? "Available" : "Coming soon"}
                        </span>
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#0b2d54]">{provider.name}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {provider.provider === "FITBIT"
                              ? "Fitbit devices"
                              : provider.provider === "GARMIN"
                                ? "Garmin devices"
                                : provider.provider === "OURA"
                                  ? "Oura Ring"
                                  : provider.provider === "POLAR"
                                    ? "Polar devices"
                                    : provider.provider === "HEALTH_CONNECT"
                                      ? "Android devices"
                                      : provider.provider === "SAMSUNG_HEALTH"
                                        ? "Galaxy devices"
                                        : "Health data"}
                          </p>
                        </div>
                        <span className="text-slate-300 transition group-hover:text-[#24c1c4]">→</span>
                      </div>
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
