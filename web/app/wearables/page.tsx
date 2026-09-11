"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Activity, Bluetooth, CheckCircle2, ChevronLeft, HeartPulse, Link2Off, Watch } from "lucide-react";
import { api } from "@/lib/api";

const HEART_RATE_SERVICE = "heart_rate";
const HEART_RATE_CHARACTERISTIC = "heart_rate_measurement";

type BluetoothDeviceLike = {
  id: string;
  name?: string;
  gatt?: { connect: () => Promise<BluetoothRemoteGATTServerLike> };
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
  const [devices, setDevices] = useState<Array<{ id: string; manufacturer: string; model: string; status: string; lastSyncAt?: string | null }>>([]);
  const [connectedName, setConnectedName] = useState("");
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
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

  useEffect(() => { loadDevices(); }, []);

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
      setStatus("Connected · receiving heart rate");

      characteristic.addEventListener("characteristicvaluechanged", async (event) => {
        const data = event.target?.value;
        if (!data || !backendDeviceIdRef.current) return;
        const bpm = parseHeartRate(data);
        setHeartRate(bpm);
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-[#0b2d54] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 hover:bg-white hover:text-[#0b2d54]"><ChevronLeft className="h-5 w-5" /> Health Home</Link>

        <section className="mt-5 overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_rgba(11,45,84,0.10)] ring-1 ring-slate-200">
          <div className="bg-[#0b2d54] px-6 py-8 text-white sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24c1c4] text-[#0b2d54]"><Watch className="h-7 w-7" /></div>
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#24c1c4]">Connected Health</p><h1 className="mt-1 text-3xl font-black">Link your watch</h1></div>
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/70">Connect a Bluetooth Low Energy wearable that exposes the standard Heart Rate Service. Sympto will securely record incoming heart-rate readings in your health data.</p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Connection</p>
                <div className="mt-3 flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${status.startsWith("Connected") ? "bg-[#24c1c4] shadow-[0_0_0_5px_rgba(36,193,196,0.15)]" : "bg-slate-300"}`} /><p className="font-black">{status}</p></div>
                {connectedName && <p className="mt-2 text-sm text-slate-500">{connectedName}</p>}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Live heart rate</p>
                <div className="mt-2 flex items-end gap-2"><HeartPulse className="mb-1 h-7 w-7 text-[#24c1c4]" /> <span className="text-4xl font-black">{heartRate ?? "—"}</span><span className="mb-1 text-sm font-bold text-slate-400">bpm</span></div>
              </div>
            </div>

            {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{error}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={connect} disabled={connecting || status.startsWith("Connected")} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0b2d54] px-5 text-base font-black text-white shadow-lg transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-50"><Bluetooth className="h-5 w-5" />{connecting ? "Connecting…" : "Connect wearable"}</button>
              <button type="button" onClick={disconnect} disabled={!backendDeviceIdRef.current} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 px-5 text-base font-black text-[#0b2d54] disabled:cursor-not-allowed disabled:opacity-40"><Link2Off className="h-5 w-5" /> Disconnect</button>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#24c1c4]" /><h2 className="font-black">Your connected devices</h2></div>
              {devices.length === 0 ? <p className="mt-3 text-sm leading-6 text-slate-500">No wearable has been connected yet.</p> : <div className="mt-4 space-y-2">{devices.map((device) => <div key={device.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"><div><p className="font-bold">{device.model}</p><p className="text-xs text-slate-500">{device.manufacturer}</p></div><span className="rounded-full bg-[#24c1c4]/10 px-3 py-1 text-xs font-black text-[#0b2d54]">{device.status}</span></div>)}</div>}
            </div>

            <div className="mt-6 rounded-2xl bg-[#24c1c4]/8 p-4 text-xs leading-5 text-slate-600"><strong className="text-[#0b2d54]">Compatibility:</strong> this browser connector uses the standard Bluetooth Heart Rate Service. Apple Health/HealthKit and Android Health Connect require the native Sympto mobile connector and are not falsely represented as browser Bluetooth devices.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
