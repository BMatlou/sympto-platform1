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
  const usingOtherSources = showSources;

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

        <section className="mt-4 overflow-hidden rounded-[2rem] border border-[#dce9ec] bg-white shadow-[0_24px_70px_rgba(11,45,84,0.08)]">
          <header className="flex flex-col gap-5 px-6 pb-6 pt-7 sm:flex-row sm:items-end sm:justify-between sm:px-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#24c1c4]">Connected Health</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-[2.35rem]">Wearables</h1>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className={`text-xs font-black transition ${showSources ? "text-slate-400" : "text-[#0b2d54]"}`}>
                Sympto
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showSources}
                aria-label={showSources ? "Show Sympto wearable" : "Show other wearables"}
                onClick={() => setShowSources((value) => !value)}
                className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] focus-visible:ring-offset-2 ${
                  showSources ? "bg-[#0b2d54]" : "bg-[#24c1c4]"
                }`}
              >
                <span
                  className={`block h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(11,45,84,0.22)] transition-transform duration-200 ${
                    showSources ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-black transition ${showSources ? "text-[#0b2d54]" : "text-slate-400"}`}>
                Other
              </span>
            </div>
          </header>

          <div className="border-t border-slate-100 px-5 pb-6 pt-5 sm:px-8 sm:pb-8">
            {!showSources ? (
              <>
                <div className="relative overflow-hidden rounded-[2rem] bg-[#0b2d54]">
                  <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#24c1c4]/10" />
                  <div className="grid min-h-[430px] lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#24c1c4]">Sympto</p>
                      <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                        Sympto Wearable
                      </h2>
                      <p className="mt-2 text-base font-medium text-white/55">Watch + wristband</p>
                      <p className="mt-6 max-w-sm text-sm leading-6 text-white/65">
                        Vitals, activity, sleep and recovery — designed around Sympto.
                      </p>

                      <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-black text-white/70">
                        <span>Vitals</span>
                        <span>Activity</span>
                        <span>Sleep</span>
                        <span>Recovery</span>
                      </div>

                      <p className="mt-9 text-xs font-bold text-white/35">Coming soon</p>
                    </div>

                    <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden border-t border-white/10 bg-white/[0.035] lg:border-l lg:border-t-0">
                      <div className="absolute inset-x-0 bottom-8 mx-auto h-px max-w-xs bg-white/10" />

                      <div className="relative h-[280px] w-[180px]">
                        <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-[2rem] bg-[#071f3a] shadow-[0_20px_45px_rgba(0,0,0,0.25)]" />
                        <div className="absolute bottom-0 left-1/2 h-24 w-24 -translate-x-1/2 rounded-[2rem] bg-[#071f3a] shadow-[0_20px_45px_rgba(0,0,0,0.25)]" />
                        <div className="absolute left-1/2 top-1/2 h-[190px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] bg-[#24c1c4] p-2 shadow-[0_30px_70px_rgba(0,0,0,0.28)]">
                          <div className="flex h-full w-full items-center justify-center rounded-[2.55rem] bg-[#0b2d54]">
                            <div className="text-center">
                              <div className="mx-auto h-11 w-11 rounded-full border-[3px] border-[#24c1c4]/60" />
                              <p className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/55">Sympto</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b2d54] text-[#24c1c4]">
                        <Bluetooth className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#0b2d54]">Bluetooth</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {connectedName || (status === "Disconnected" ? "Disconnected" : "Not connected")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Heart rate</p>
                        <p className="text-2xl font-black text-[#0b2d54]">
                          {heartRate ?? "—"} <span className="text-xs text-slate-400">bpm</span>
                        </p>
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
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b2d54] transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-35"
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

                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {otherProviders.map((provider) => {
                    const availableNow = provider.status === "AVAILABLE_NOW";

                    return (
                      <div
                        key={provider.provider}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[#0b2d54]">
                            <Watch className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-black text-[#0b2d54]">{provider.name}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                            availableNow ? "bg-[#24c1c4]/12 text-[#0b2d54]" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {availableNow ? "Available" : "Coming soon"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {devices.length > 0 && (
              <div className="mt-7 border-t border-slate-100 pt-6">
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
                      <div
                        key={device.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b2d54] text-[#24c1c4]">
                            <Watch className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#0b2d54]">{device.model}</p>
                            <p className="text-xs text-slate-500">{device.manufacturer}</p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {lastSync ? `Last sync ${lastSync}` : "Waiting for first reading"}
                              {latest ? ` · ${latest.value} ${latest.unit}` : ""}
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
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
