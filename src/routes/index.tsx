import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Loader2, Moon, Sun, Send, Copy, Check, Plus, X } from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

type Method = "GET" | "POST" | "PUT" | "DELETE";
type Header = { id: string; key: string; value: string };

const newHeader = (): Header => ({
  id: Math.random().toString(36).slice(2),
  key: "",
  value: "",
});

function Index() {
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/todos/1");
  const [method, setMethod] = useState<Method>("GET");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState<Header[]>([newHeader()]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

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

  const sendRequest = async () => {
    setError("");
    setResponse("");
    setStatus(null);
    setStatusText("");

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
    try {
      const res = await fetch(url, {
        method,
        headers: Object.keys(finalHeaders).length ? finalHeaders : undefined,
        body: parsedBody,
      });
      setStatus(res.status);
      setStatusText(res.statusText);
      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
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

  const statusColor =
    status === null
      ? ""
      : status >= 200 && status < 300
      ? "text-emerald-500"
      : status >= 400
      ? "text-destructive"
      : "text-amber-500";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Mini API Tester
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Quickly test HTTP endpoints from your browser.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="sm:w-32">
                <Label htmlFor="method" className="sr-only">
                  Method
                </Label>
                <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="url" className="sr-only">
                  URL
                </Label>
                <Input
                  id="url"
                  placeholder="https://api.example.com/endpoint"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm">Headers</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setHeaders((h) => [...h, newHeader()])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add header
                </Button>
              </div>
              <div className="space-y-2">
                {headers.map((h, i) => (
                  <div key={h.id} className="flex gap-2">
                    <Input
                      placeholder="Header name (e.g. Authorization)"
                      value={h.key}
                      onChange={(e) =>
                        setHeaders((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, key: e.target.value } : x))
                        )
                      }
                      className="flex-1 font-mono text-sm"
                    />
                    <Input
                      placeholder="Value (e.g. Bearer ...)"
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
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {hasBody && (
              <div>
                <Label htmlFor="body" className="mb-2 block text-sm">
                  Request body (JSON)
                </Label>
                <Textarea
                  id="body"
                  placeholder='{ "key": "value" }'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            )}

            <Button
              onClick={sendRequest}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Response</CardTitle>
            <div className="flex items-center gap-3">
              {status !== null && (
                <span className={`text-sm font-semibold ${statusColor}`}>
                  {status} {statusText}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={copyResponse}
                disabled={!response}
              >
                {copied ? (
                  <Check className="mr-2 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-2 h-3.5 w-3.5" />
                )}
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading response...
              </div>
            ) : error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : response ? (
              <pre className="max-h-[480px] overflow-auto rounded-md bg-muted p-4 font-mono text-xs leading-relaxed sm:text-sm">
                {response}
              </pre>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Send a request to see the response here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
