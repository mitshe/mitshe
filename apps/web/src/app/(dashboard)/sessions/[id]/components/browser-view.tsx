"use client";

import { useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionBrowserInfo } from "@/lib/api/hooks";

interface BrowserViewProps {
  sessionId: string;
}

export default function BrowserView({ sessionId }: BrowserViewProps) {
  const { data: browserInfo, isLoading, error } = useSessionBrowserInfo(sessionId, true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const noVncUrl = browserInfo
    ? `${browserInfo.httpUrl}/vnc.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=1000`
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Connecting to browser...</p>
        </div>
      </div>
    );
  }

  if (error || !noVncUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Browser not available"}
          </p>
          <p className="text-xs text-muted-foreground">
            Make sure the session was created with browser enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${fullscreen ? "fixed inset-0 z-50 bg-background" : "h-full"}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground">Browser Preview</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIframeKey((k) => k + 1)}
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <iframe
        key={iframeKey}
        ref={iframeRef}
        src={noVncUrl}
        className="flex-1 w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
