import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Moon, Sun, Send, Copy, Check, Plus, X, Zap,
  History, Trash2, Clock, FileJson, Sparkles, Search,
  Save, PanelLeftOpen,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  CollectionsSidebar,
  SaveRequestDialog,
  type Collection,
  type SavedRequest,
} from "@/components/CollectionsSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export const Route = createFileRoute("/")({
  component: Index,
});

type Method = "GET" | "POST" | "PUT" | "DELETE";
type Header = { id: string; key: string; value: string };
type HistoryItem = {
  id: string;
  method: Method;
  url: string;
  status: number | null;
  ts: number;
};

const newHeader = (): Header => ({
  id: Math.random().toString(36).slice(2),
  key: "",
  value: "",
});

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-success/15 text-success border-success/30",
  POST: "bg-primary/15 text-primary border-primary/30",
  PUT: "bg-warning/15 text-warning border-warning/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

const SAMPLES: { label: string; method: Method; url: string }[] = [
  { label: "Todo", method: "GET", url: "https://jsonplaceholder.typicode.com/todos/1" },
  { label: "Users", method: "GET", url: "https://jsonplaceholder.typicode.com/users" },
  { label: "Create post", method: "POST", url: "https://jsonplaceholder.typicode.com/posts" },
];

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function highlightJson(json: string) {
  // Escape HTML
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g,
    (m, key, str, bool, num) => {
      if (key) return `<span class="text-primary">${key}</span>`;
      if (str) return `<span class="text-success">${str}</span>`;
      if (bool) return `<span class="text-warning font-medium">${bool}</span>`;
      if (num) return `<span class="text-[oklch(0.65_0.2_30)]">${num}</span>`;
      return m;
    }
  );
}

function Index() {
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/todos/1");
  const [method, setMethod] = useState<Method>("GET");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState<Header[]>([newHeader()]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("");
  const [response, setResponse] = useState("");
  const [responseHeaders, setResponseHeaders] = useState<[string, string][]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dark, setDark] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [activeTab, setActiveTab] = useState("body");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    try {
      const h = JSON.parse(localStorage.getItem("api-history") || "[]");
      if (Array.isArray(h)) setHistory(h);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("api-history", JSON.stringify(history.slice(0, 20)));
  }, [history]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const isValidUrl = (value: string) => {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const hasBody = method === "POST" || method === "PUT";
  const urlValid = url.length === 0 || isValidUrl(url);

  const sendRequest = async () => {
    setError("");
    setResponse("");
    setStatus(null);
    setStatusText("");
    setDuration(null);
    setSize(null);
    setResponseHeaders([]);

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (http:// or https://)");
      toast.error("Invalid URL");
      return;
    }

    let parsedBody: string | undefined;
    if (hasBody && body.trim()) {
      try {
        parsedBody = JSON.stringify(JSON.parse(body));
      } catch {
        setError("Request body must be valid JSON");
        toast.error("Invalid JSON body");
        return;
      }
    }

    const finalHeaders: Record<string, string> = {};
    for (const h of headers) {
      const k = h.key.trim();
      const v = h.value.trim();
      if (!k) continue;
      if (!/^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/.test(k)) {
        setError(`Invalid header name: "${k}"`);
        toast.error("Invalid header name");
        return;
      }
      finalHeaders[k] = v;
    }
    if (parsedBody && !Object.keys(finalHeaders).some((k) => k.toLowerCase() === "content-type")) {
      finalHeaders["Content-Type"] = "application/json";
    }

    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method,
        headers: Object.keys(finalHeaders).length ? finalHeaders : undefined,
        body: parsedBody,
      });
      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);
      setStatus(res.status);
      setStatusText(res.statusText);
      setResponseHeaders(Array.from(res.headers.entries()));
      const text = await res.text();
      setSize(new Blob([text]).size);
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
      setActiveTab("body");
      setHistory((h) => [
        { id: Math.random().toString(36).slice(2), method, url, status: res.status, ts: Date.now() },
        ...h.filter((x) => !(x.url === url && x.method === method)).slice(0, 19),
      ]);
      toast.success(`${res.status} · ${elapsed}ms`);
      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success("Response copied");
    setTimeout(() => setCopied(false), 1500);
  };

  // Cmd/Ctrl + Enter to send
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!loading) sendRequest();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, method, body, headers, loading]);

  const formatBody = () => {
    if (!body.trim()) return;
    try {
      setBody(JSON.stringify(JSON.parse(body), null, 2));
      toast.success("Body formatted");
    } catch {
      toast.error("Invalid JSON");
    }
  };

  const statusInfo = useMemo(() => {
    if (status === null) return null;
    const cls =
      status >= 200 && status < 300
        ? "bg-success/15 text-success border-success/30"
        : status >= 400
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : "bg-warning/15 text-warning border-warning/30";
    return { cls };
  }, [status]);

  const highlighted = useMemo(() => {
    if (!response) return "";
    try {
      JSON.parse(response);
      return highlightJson(response);
    } catch {
      return response.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [response]);

  return (
    <div className="min-h-screen bg-gradient-subtle text-foreground">
      <Toaster richColors position="top-center" />

      {/* Decorative glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[400px] bg-gradient-primary opacity-[0.08] blur-3xl" />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <header className="mb-8 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Mini <span className="text-gradient">API Tester</span>
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Quickly test HTTP endpoints from your browser
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-full transition-smooth hover-scale"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        {/* Sample endpoints */}
        <div className="mb-4 flex flex-wrap items-center gap-2 animate-fade-in">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Try:
          </span>
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => { setMethod(s.method); setUrl(s.url); }}
              className="group flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs transition-smooth hover:border-primary/50 hover:shadow-card hover-scale"
            >
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${METHOD_STYLES[s.method]}`}>
                {s.method}
              </span>
              {s.label}
            </button>
          ))}
        </div>

        <Card className="border-border/60 shadow-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileJson className="h-4 w-4 text-primary" />
              Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="sm:w-32">
                <Label htmlFor="method" className="sr-only">Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                  <SelectTrigger
                    id="method"
                    className={`font-bold border-2 transition-smooth ${METHOD_STYLES[method]}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["GET", "POST", "PUT", "DELETE"] as Method[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        <span className={`inline-block w-14 rounded px-1.5 py-0.5 text-center text-[10px] font-bold border ${METHOD_STYLES[m]} mr-2`}>
                          {m}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="url" className="sr-only">URL</Label>
                <Input
                  id="url"
                  placeholder="https://api.example.com/endpoint"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`font-mono text-sm transition-smooth ${
                    !urlValid ? "border-destructive focus-visible:ring-destructive/40" : ""
                  }`}
                />
              </div>
              <Button
                onClick={sendRequest}
                disabled={loading || !url}
                className="bg-gradient-primary text-primary-foreground shadow-glow transition-smooth hover:opacity-90 hover-scale sm:w-auto"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Send</>
                )}
              </Button>
            </div>
            {!urlValid && (
              <p className="text-xs text-destructive animate-fade-in">Enter a valid http(s) URL</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Tip: press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘/Ctrl + Enter</kbd> to send
            </p>

            <Tabs defaultValue="headers" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
                <TabsTrigger value="headers">
                  Headers
                  {headers.filter((h) => h.key.trim()).length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                      {headers.filter((h) => h.key.trim()).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="body" disabled={!hasBody}>
                  Body {hasBody && body.trim() && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="headers" className="mt-4 space-y-2">
                {headers.map((h, i) => (
                  <div key={h.id} className="flex gap-2 animate-fade-in">
                    <Input
                      placeholder="Header name"
                      value={h.key}
                      onChange={(e) =>
                        setHeaders((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, key: e.target.value } : x))
                        )
                      }
                      className="flex-1 font-mono text-sm"
                    />
                    <Input
                      placeholder="Value"
                      value={h.value}
                      onChange={(e) =>
                        setHeaders((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                        )
                      }
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setHeaders((arr) => {
                          const next = arr.filter((_, j) => j !== i);
                          return next.length ? next : [newHeader()];
                        })
                      }
                      aria-label="Remove header"
                      className="transition-smooth hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHeaders((h) => [...h, newHeader()])}
                  className="transition-smooth"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add header
                </Button>
              </TabsContent>

              <TabsContent value="body" className="mt-4">
                {hasBody ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="body" className="text-sm">Request body (JSON)</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={formatBody}>
                        <Sparkles className="mr-1 h-3.5 w-3.5" /> Format
                      </Button>
                    </div>
                    <Textarea
                      id="body"
                      placeholder='{ "key": "value" }'
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={6}
                      className="font-mono text-sm transition-smooth focus:shadow-card"
                    />
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Body is only available for POST and PUT
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card ref={responseRef} className="mt-6 border-border/60 shadow-card animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              Response
              {loading && <span className="h-2 w-2 animate-glow-pulse rounded-full bg-primary" />}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {status !== null && statusInfo && (
                <Badge variant="outline" className={`border ${statusInfo.cls} animate-scale-in`}>
                  {status} {statusText}
                </Badge>
              )}
              {duration !== null && (
                <Badge variant="outline" className="gap-1 animate-scale-in">
                  <Clock className="h-3 w-3" /> {duration}ms
                </Badge>
              )}
              {size !== null && (
                <Badge variant="outline" className="animate-scale-in">{formatBytes(size)}</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={copyResponse}
                disabled={!response}
                className="transition-smooth"
              >
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-success" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                Loading response...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive animate-fade-in">
                {error}
              </div>
            ) : response ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
                <TabsList>
                  <TabsTrigger value="body">Body</TabsTrigger>
                  <TabsTrigger value="headers">
                    Headers
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                      {responseHeaders.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="body" className="mt-3">
                  <pre
                    className="max-h-[480px] overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed sm:text-sm"
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                </TabsContent>
                <TabsContent value="headers" className="mt-3">
                  <div className="max-h-[480px] overflow-auto rounded-lg border bg-muted/40 divide-y divide-border/60">
                    {responseHeaders.map(([k, v]) => (
                      <div key={k} className="grid grid-cols-1 gap-1 p-3 text-xs sm:grid-cols-3 sm:gap-3">
                        <div className="font-mono font-semibold text-primary">{k}</div>
                        <div className="font-mono break-all sm:col-span-2">{v}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Send a request to see the response here
              </p>
            )}
          </CardContent>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card className="mt-6 border-border/60 shadow-card animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" /> History
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {history.length}
                </Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setHistory([]); setHistoryQuery(""); toast.success("History cleared"); }}
                className="transition-smooth hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 p-0 pb-2">
              <div className="relative px-6">
                <Search className="pointer-events-none absolute left-9 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Filter by URL or method..."
                  className="h-9 pl-8 pr-9 text-sm"
                />
                {historyQuery && (
                  <button
                    onClick={() => setHistoryQuery("")}
                    className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-smooth hover:text-foreground"
                    aria-label="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {(() => {
                const q = historyQuery.trim().toLowerCase();
                const filtered = q
                  ? history.filter(
                      (h) =>
                        h.url.toLowerCase().includes(q) ||
                        h.method.toLowerCase().includes(q)
                    )
                  : history;
                if (filtered.length === 0) {
                  return (
                    <p className="px-6 py-6 text-center text-sm text-muted-foreground">
                      No requests match "{historyQuery}"
                    </p>
                  );
                }
                return (
                  <ul className="divide-y divide-border/60 border-t border-border/60">
                    {filtered.map((h) => (
                      <li key={h.id}>
                        <button
                          onClick={() => { setMethod(h.method); setUrl(h.url); }}
                          className="flex w-full items-center gap-3 px-6 py-2.5 text-left text-sm transition-smooth hover:bg-muted/50"
                        >
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold border ${METHOD_STYLES[h.method]}`}>
                            {h.method}
                          </span>
                          <span className="flex-1 truncate font-mono text-xs">{h.url}</span>
                          {h.status !== null && (
                            <span
                              className={`shrink-0 text-xs font-semibold ${
                                h.status >= 200 && h.status < 300
                                  ? "text-success"
                                  : h.status >= 400
                                  ? "text-destructive"
                                  : "text-warning"
                              }`}
                            >
                              {h.status}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </CardContent>
          </Card>
        )}

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Built for fast API exploration · ⌘/Ctrl + Enter to send
        </footer>
      </div>
    </div>
  );
}
