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

  return (
    <main className="min-h-screen bg-[#F4FBFB] px-4 py-8 text-[#0b2d54] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-[#0b2d54]"
        >
          <ChevronLeft className="h-5 w-5" />
          Health Home
        </Link>

        <section className="mt-4 overflow-hidden rounded-[2rem] border border-[#dfe9ed] bg-white shadow-[0_24px_70px_rgba(11,45,84,0.10)]">
          <div className="bg-[#0b2d54] px-6 py-7 text-white sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#24c1c4]">
                  <Watch className="h-3.5 w-3.5" />
                  Connected Health
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Your health, connected.</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                  Bring your everyday health signals into Sympto. Your own Sympto wearable is designed to be the primary connection, with other compatible health sources supported alongside it.
                </p>
              </div>

              <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 lg:block">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">One health timeline</p>
                <p className="mt-1 text-sm font-bold text-white">Manual · Clinical · Wearable</p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="inline-flex w-full max-w-md rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
              <button
                type="button"
                onClick={() => setShowSources(false)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                  !showSources
                    ? "bg-white text-[#0b2d54] shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-[#0b2d54]"
                }`}
                aria-pressed={!showSources}
              >
                <Watch className="h-4 w-4" />
                Sympto wearable
              </button>
              <button
                type="button"
                onClick={() => setShowSources(true)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                  showSources
                    ? "bg-white text-[#0b2d54] shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-[#0b2d54]"
                }`}
                aria-pressed={showSources}
              >
                <Activity className="h-4 w-4" />
                Other sources
              </button>
            </div>

            {!showSources ? (
              <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-[#bfe8e9] bg-[#F5FCFC]">
                <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#24c1c4]/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#0b2d54]">
                          {symptoProvider?.status === "PROTOCOL_READY" ? "Protocol ready" : "Sympto wearable"}
                        </span>
                        <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Sympto Wearable</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                          Our own wearable is being designed around the health signals Sympto already understands — vitals, activity, exercise, sleep and recovery.
                        </p>
                      </div>
                      <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0b2d54] text-[#24c1c4] shadow-[0_12px_30px_rgba(11,45,84,0.18)] sm:flex">
                        <Watch className="h-8 w-8" />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        "Vitals",
                        "Exercise",
                        "Sleep",
                        "Recovery",
                      ].map((item) => (
                        <div key={item} className="rounded-xl border border-[#d9eeee] bg-white px-3 py-3 text-center text-xs font-black text-[#0b2d54]">
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3 rounded-2xl border border-[#d7eeee] bg-white px-4 py-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#24c1c4]/12 text-[#0b2d54]">
                          <Watch className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-black text-[#0b2d54]">Sympto device</p>
                          <p className="text-[11px] text-slate-500">
                            {symptoProvider?.status === "PROTOCOL_READY" ? "Being prepared for the Sympto mobile experience" : "Primary wearable connection"}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-4 py-3 text-xs font-black text-white">
                        <span className="h-2 w-2 rounded-full bg-[#24c1c4]" />
                        Built for Sympto
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[#d9eeee] bg-white p-6 sm:p-8 lg:border-l lg:border-t-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Bluetooth today</p>
                    <h3 className="mt-2 text-lg font-black text-[#0b2d54]">Connect a compatible wearable</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      The browser connection currently supports devices exposing the standard Bluetooth Heart Rate Service.
                    </p>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${status.startsWith("Connected") ? "bg-[#24c1c4] shadow-[0_0_0_5px_rgba(36,193,196,0.15)]" : "bg-slate-300"}`} />
                        <div>
                          <p className="text-sm font-black text-[#0b2d54]">{status}</p>
                          {connectedName && <p className="mt-0.5 text-xs text-slate-500">{connectedName}</p>}
                        </div>
                      </div>
                      <div className="mt-4 flex items-end gap-2">
                        <HeartPulse className="mb-1 h-5 w-5 text-[#24c1c4]" />
                        <span className="text-3xl font-black">{heartRate ?? "—"}</span>
                        <span className="mb-1 text-xs font-bold text-slate-400">bpm</span>
                      </div>
                    </div>

                    {error && (
                      <p className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-semibold leading-5 text-red-700" role="alert">
                        {error}
                      </p>
                    )}

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <button
                        type="button"
                        onClick={connect}
                        disabled={connecting || status.startsWith("Connected")}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(11,45,84,0.18)] transition hover:-translate-y-0.5 hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Bluetooth className="h-4 w-4" />
                        {connecting ? "Connecting…" : "Connect via Bluetooth"}
                      </button>
                      <button
                        type="button"
                        onClick={disconnect}
                        disabled={!backendDeviceIdRef.current}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#0b2d54] transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Link2Off className="h-4 w-4" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Compatible sources</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Connect the health sources you already use.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    These sources sit alongside the Sympto wearable. Their data is normalized into the same Sympto health records used by manual and clinical entries.
                  </p>
                </div>

                {providers.length > 0 && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {otherProviders.map((provider) => {
                      const availableNow = provider.status === "AVAILABLE_NOW";
                      const ready = provider.status === "PROTOCOL_READY";

                      return (
                        <div
                          key={provider.provider}
                          className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#bfe8e9] hover:shadow-[0_14px_30px_rgba(11,45,84,0.07)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#0b2d54] transition group-hover:bg-[#24c1c4]/12">
                              <Watch className="h-5 w-5" />
                            </div>
                            <span
                              className={
                                "rounded-full px-2.5 py-1 text-[9px] font-black " +
                                (availableNow
                                  ? "bg-[#24c1c4]/10 text-[#0b2d54]"
                                  : ready
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-slate-100 text-slate-500")
                              }
                            >
                              {availableNow ? "Available now" : ready ? "Protocol ready" : "Connector required"}
                            </span>
                          </div>
                          <p className="mt-4 text-sm font-black text-[#0b2d54]">{provider.name}</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">{provider.note}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
                  <div>
                    <p className="text-sm font-black text-[#0b2d54]">One health timeline</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Wearable, manual and clinical observations remain separate records while Sympto brings them together in the user's health experience.
                    </p>
                  </div>
                  <span className="mt-3 inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#24c1c4]/10 px-3 py-2 text-xs font-black text-[#0b2d54] sm:mt-0">
                    <Activity className="h-4 w-4" />
                    Normalized by Sympto
                  </span>
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-slate-100 pt-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Your devices</p>
                  <h2 className="mt-1 text-xl font-black text-[#0b2d54]">Connected devices</h2>
                </div>
                {devices.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    {devices.length} connected
                  </span>
                )}
              </div>

              {devices.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                  <p className="text-sm font-bold text-[#0b2d54]">No wearable connected yet.</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your readings will appear here once a compatible wearable is connected.
                  </p>
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
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b2d54] text-[#24c1c4]">
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

            <div className="mt-6 rounded-2xl border border-[#d9eeee] bg-[#F5FCFC] p-4 text-xs leading-5 text-slate-600">
              <strong className="text-[#0b2d54]">How Sympto uses connected data:</strong>{" "}
              sources can feed vitals, sleep, exercise and wellness data into the same patient-owned health timeline as manual and clinical records. The current browser connection supports standard Bluetooth health devices; Apple Health, Health Connect, Samsung Health and provider cloud APIs require their native/provider connectors.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
