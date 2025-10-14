import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const API_URL = "http://localhost:3001";

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "=");
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export default function Dashboard({ onLogout }) {
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [queue, setQueue] = useState([]);
  const [gifted, setGifted] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [pollInterval, setPollInterval] = useState(3000);
  const pollRef = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const payload = decodeJwtPayload(token);
    if (!payload) {
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }
    if (payload.role === "minecraft") {
      navigate("/minecraft");
      return;
    }
    fetchAccounts();
    // connect socket for logs
    connectSocket();
    return () => {
      disconnectSocket();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeAccount) {
      startPolling();
    } else {
      stopPolling();
      setQueue([]);
      setGifted([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount, pollInterval]);

  function connectSocket() {
    try {
      socketRef.current = io(API_URL, { auth: { token } });
      socketRef.current.on("connect", () => {
        setLogs((l) => [`[ws] connected ${new Date().toLocaleTimeString()}`, ...l].slice(0, 200));
      });
      socketRef.current.on("log", (msg) => {
        setLogs((l) => [typeof msg === "string" ? msg : JSON.stringify(msg), ...l].slice(0, 200));
      });
    } catch (err) {
      console.error("Socket connect error", err);
    }
  }

  function disconnectSocket() {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/accounts/${activeAccount}/queue`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setQueue(Array.isArray(data) ? data : []);
        }
        const res2 = await fetch(`${API_URL}/api/accounts/${activeAccount}/gifted`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res2.ok) {
          const data2 = await res2.json();
          setGifted(Array.isArray(data2) ? data2 : []);
        }
      } catch (err) {
        // ignore polling errors
      }
    }, pollInterval);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function fetchAccounts() {
    try {
      const res = await fetch(`${API_URL}/api/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  async function createAccount() {
    if (!newAccountName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: newAccountName.trim() })
      });
      if (res.ok) {
        setNewAccountName("");
        fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function startAccount(id) {
    try {
      await fetch(`${API_URL}/api/accounts/${id}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAccounts();
    } catch {}
  }

  async function stopAccount(id) {
    try {
      await fetch(`${API_URL}/api/accounts/${id}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAccounts();
    } catch {}
  }

  function handleLogout() {
    localStorage.removeItem("token");
    if (onLogout) onLogout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between bg-white p-4 rounded shadow">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-600">Manage TikTok accounts and view logs</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/minecraft")} className="px-3 py-1 bg-gray-200 rounded">Minecraft</button>
            <button onClick={handleLogout} className="px-3 py-1 bg-red-500 text-white rounded">Logout</button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">TikTok Accounts</h2>
              <div className="flex items-center gap-2">
                <input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="New account username" className="px-3 py-2 border rounded" />
                <button onClick={createAccount} className="px-3 py-2 bg-blue-600 text-white rounded">Create</button>
                <button onClick={fetchAccounts} className="px-3 py-2 bg-gray-200 rounded">Refresh</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Username</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => (
                    <tr key={acc.id} className="border-t">
                      <td className="px-4 py-3">{acc.id}</td>
                      <td className="px-4 py-3 font-mono">{acc.username}</td>
                      <td className="px-4 py-3">{acc.status}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setActiveAccount(acc.id); }} className="mr-2 px-3 py-1 bg-indigo-600 text-white rounded">Select</button>
                        {acc.status !== "running" ? (
                          <button onClick={() => startAccount(acc.id)} className="mr-2 px-3 py-1 bg-green-600 text-white rounded">Start</button>
                        ) : (
                          <button onClick={() => stopAccount(acc.id)} className="mr-2 px-3 py-1 bg-red-600 text-white rounded">Stop</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Selected Account</h3>
            <div className="mb-4 text-sm text-gray-600">{activeAccount ? `ID: ${activeAccount}` : "No account selected"}</div>

            <h4 className="font-medium mt-4 mb-2">Queue</h4>
            <div className="space-y-2 max-h-48 overflow-auto text-sm">
              {queue.length === 0 && <div className="text-gray-500">Queue is empty</div>}
              {queue.map(q => <div key={q.jobId} className="p-2 border rounded">{q.user} - {q.status}</div>)}
            </div>

            <h4 className="font-medium mt-4 mb-2">Gifted</h4>
            <div className="space-y-2 max-h-40 overflow-auto text-sm">
              {gifted.length === 0 && <div className="text-gray-500">No gifted entries</div>}
              {gifted.map(g => <div key={g.id} className="p-2 border rounded">{g.user} - {g.giftName}</div>)}
            </div>
          </aside>
        </section>

        <section className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Realtime Logs</h3>
          <div className="max-h-64 overflow-auto font-mono text-sm bg-gray-50 p-2 rounded">
            {logs.map((l, i) => <div key={i} className="py-1 border-b last:border-b-0">{l}</div>)}
          </div>
        </section>
      </div>
    </div>
  );
}