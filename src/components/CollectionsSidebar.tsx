import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FolderPlus,
  Folder,
  ChevronRight,
  Trash2,
  X,
  Search,
  PanelLeftClose,
  Inbox,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export type Method = "GET" | "POST" | "PUT" | "DELETE";
export type SavedHeader = { id: string; key: string; value: string };
export type SavedRequest = {
  id: string;
  name: string;
  method: Method;
  url: string;
  body: string;
  headers: SavedHeader[];
};
export type Collection = {
  id: string;
  name: string;
  requests: SavedRequest[];
};

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-success/15 text-success border-success/30",
  POST: "bg-primary/15 text-primary border-primary/30",
  PUT: "bg-warning/15 text-warning border-warning/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

type Props = {
  collections: Collection[];
  setCollections: (next: Collection[]) => void;
  onLoadRequest: (req: SavedRequest) => void;
  onClose?: () => void;
};

export function CollectionsSidebar({
  collections,
  setCollections,
  onLoadRequest,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [newColOpen, setNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [pendingImport, setPendingImport] = useState<Collection[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addCollection = () => {
    const name = newColName.trim();
    if (!name) return;
    const id = Math.random().toString(36).slice(2);
    setCollections([...collections, { id, name, requests: [] }]);
    setOpenIds((o) => ({ ...o, [id]: true }));
    setNewColName("");
    setNewColOpen(false);
    toast.success(`Collection "${name}" created`);
  };

  const deleteCollection = (id: string) => {
    setCollections(collections.filter((c) => c.id !== id));
    toast.success("Collection deleted");
  };

  const deleteRequest = (cid: string, rid: string) => {
    setCollections(
      collections.map((c) =>
        c.id === cid ? { ...c, requests: c.requests.filter((r) => r.id !== rid) } : c,
      ),
    );
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? collections
        .map((c) => ({
          ...c,
          requests: c.requests.filter(
            (r) =>
              r.name.toLowerCase().includes(q) ||
              r.url.toLowerCase().includes(q) ||
              r.method.toLowerCase().includes(q),
          ),
        }))
        .filter((c) => c.name.toLowerCase().includes(q) || c.requests.length > 0)
    : collections;

  return (
    <aside className="flex h-full flex-col bg-card/50 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Collections</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setNewColOpen(true)}
            aria-label="New collection"
            title="New collection"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 lg:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="border-b border-border/60 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search collections..."
            className="h-8 pl-8 pr-7 text-xs"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
            <Inbox className="mb-2 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-muted-foreground">No collections</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a collection to save and organize requests
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setNewColOpen(true)}
            >
              <FolderPlus className="mr-1.5 h-3.5 w-3.5" /> New collection
            </Button>
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((c) => {
              const isOpen = openIds[c.id] ?? true;
              return (
                <li key={c.id}>
                  <Collapsible
                    open={isOpen}
                    onOpenChange={(o) =>
                      setOpenIds((s) => ({ ...s, [c.id]: o }))
                    }
                  >
                    <div className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/60">
                      <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 text-left text-sm font-medium">
                        <ChevronRight
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                            isOpen ? "rotate-90" : ""
                          }`}
                        />
                        <Folder className="h-3.5 w-3.5 text-primary/80" />
                        <span className="truncate">{c.name}</span>
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          {c.requests.length}
                        </span>
                      </CollapsibleTrigger>
                      <button
                        onClick={() => deleteCollection(c.id)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                        aria-label="Delete collection"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <CollapsibleContent className="ml-4 mt-0.5 space-y-0.5 border-l border-border/60 pl-1">
                      {c.requests.length === 0 ? (
                        <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                          Empty — save a request here
                        </p>
                      ) : (
                        c.requests.map((r) => (
                          <div
                            key={r.id}
                            className="group/req flex items-center gap-1.5 rounded-md pl-1 pr-1 hover:bg-muted/60"
                          >
                            <button
                              onClick={() => onLoadRequest(r)}
                              className="flex flex-1 items-center gap-2 px-1 py-1.5 text-left text-xs"
                              title={`${r.method} ${r.url}`}
                            >
                              <span
                                className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold border ${METHOD_STYLES[r.method]}`}
                              >
                                {r.method}
                              </span>
                              <span className="flex-1 truncate">{r.name}</span>
                            </button>
                            <button
                              onClick={() => deleteRequest(c.id, r.id)}
                              className="rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover/req:opacity-100"
                              aria-label="Delete request"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={newColOpen} onOpenChange={setNewColOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="col-name">Name</Label>
            <Input
              id="col-name"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="e.g. My API"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") addCollection();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewColOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCollection}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

type SaveDialogProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  collections: Collection[];
  onCreateCollection: (name: string) => string; // returns id
  onSave: (collectionId: string, name: string) => void;
  defaultName: string;
};

export function SaveRequestDialog({
  open,
  onOpenChange,
  collections,
  onCreateCollection,
  onSave,
  defaultName,
}: SaveDialogProps) {
  const [name, setName] = useState(defaultName);
  const [collectionId, setCollectionId] = useState<string>("");
  const [newName, setNewName] = useState("");

  const handleSave = () => {
    let cid = collectionId;
    if (cid === "__new__") {
      const n = newName.trim() || "New collection";
      cid = onCreateCollection(n);
    } else if (!cid && collections[0]) {
      cid = collections[0].id;
    } else if (!cid) {
      cid = onCreateCollection("My collection");
    }
    const reqName = name.trim() || defaultName || "Untitled request";
    onSave(cid, reqName);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName(defaultName);
          setCollectionId(collections[0]?.id ?? "__new__");
          setNewName("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="req-name">Request name</Label>
            <Input
              id="req-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get user profile"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Collection</Label>
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value="__new__">+ New collection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {collectionId === "__new__" && (
            <div className="space-y-1.5">
              <Label htmlFor="new-col">New collection name</Label>
              <Input
                id="new-col"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My API"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
