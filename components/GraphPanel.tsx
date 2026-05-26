"use client";

import {
  Loader2,
  Network,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type {
  Conversation,
  GraphEdge,
  GraphNode,
  GraphNodeType,
} from "@/lib/types";

const NODE_COLORS: Record<GraphNodeType, string> = {
  person: "#C96442",
  concept: "#6E9FC9",
  place: "#72B88A",
  thing: "#B88ADB",
  event: "#E07878",
  organization: "#70C4C4",
};

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Props {
  conversation: Conversation;
  refreshing: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

function useForceLayout(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  nodes: GraphNode[],
  edges: GraphEdge[],
  isDark: boolean,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };
    resize();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    const sim: SimNode[] = nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = Math.min(W, H) * 0.28;
      return {
        ...n,
        x: W / 2 + Math.cos(angle) * radius,
        y: H / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    let settled = 0;
    let raf = 0;

    const tick = () => {
      // pairwise repulsion
      for (let i = 0; i < sim.length; i++) {
        for (let j = i + 1; j < sim.length; j++) {
          const a = sim[i];
          const b = sim[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2800 / (d * d + 1);
          a.vx -= (dx / d) * force;
          a.vy -= (dy / d) * force;
          b.vx += (dx / d) * force;
          b.vy += (dy / d) * force;
        }
      }
      // spring along edges
      for (const e of edges) {
        const a = sim.find((n) => n.id === e.source);
        const b = sim.find((n) => n.id === e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 110) * 0.04;
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      }
      // centering + damping + bounds
      for (const n of sim) {
        n.vx += (W / 2 - n.x) * 0.008;
        n.vy += (H / 2 - n.y) * 0.008;
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x = Math.max(50, Math.min(W - 50, n.x + n.vx));
        n.y = Math.max(34, Math.min(H - 30, n.y + n.vy));
      }
      const maxMove = Math.max(...sim.map((n) => Math.abs(n.vx) + Math.abs(n.vy)));
      if (maxMove < 0.4) settled++;
      else settled = 0;

      // draw
      ctx.clearRect(0, 0, W, H);
      const edgeColor = isDark
        ? "rgba(255,255,255,0.16)"
        : "rgba(61,57,41,0.22)";
      const labelColor = isDark
        ? "rgba(255,255,255,0.45)"
        : "rgba(61,57,41,0.55)";

      // edges
      for (const e of edges) {
        const a = sim.find((n) => n.id === e.source);
        const b = sim.find((n) => n.id === e.target);
        if (!a || !b) continue;
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const ex = b.x - Math.cos(angle) * 14;
        const ey = b.y - Math.sin(angle) * 14;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        // arrowhead
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - 7 * Math.cos(angle - 0.42),
          ey - 7 * Math.sin(angle - 0.42),
        );
        ctx.lineTo(
          ex - 7 * Math.cos(angle + 0.42),
          ey - 7 * Math.sin(angle + 0.42),
        );
        ctx.closePath();
        ctx.fillStyle = edgeColor;
        ctx.fill();
        // edge label
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.font = "9.5px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = labelColor;
        ctx.fillText(e.label || "", mx, my - 4);
      }

      // nodes
      for (const n of sim) {
        const col = NODE_COLORS[n.type] ?? "#8a8aaa";
        const R = 10;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R * 2.6);
        g.addColorStop(0, col + "40");
        g.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, R * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, R, 0, Math.PI * 2);
        ctx.fillStyle = col + "22";
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // node label
        ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        const tw = ctx.measureText(n.label).width;
        ctx.fillStyle = isDark ? "rgba(38,38,36,0.85)" : "rgba(250,249,245,0.92)";
        ctx.fillRect(n.x - tw / 2 - 3, n.y + R + 4, tw + 6, 15);
        ctx.fillStyle = isDark ? "#F5F4EE" : "#3D3929";
        ctx.fillText(n.label, n.x, n.y + R + 15);
      }

      if (settled < 30) {
        raf = requestAnimationFrame(tick);
      }
    };
    tick();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [canvasRef, nodes, edges, isDark]);
}

export function GraphPanel({
  conversation,
  refreshing,
  onRefresh,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const graph = conversation.graph;
  useForceLayout(canvasRef, graph?.nodes ?? [], graph?.edges ?? [], isDark);

  const used = graph?.messageCount ?? 0;
  const total = conversation.messages.length;
  const stale = graph ? used < total : false;

  return (
    <aside className="flex fixed inset-y-0 right-0 z-[60] w-full max-w-[100vw] h-[100dvh] shrink-0 flex-col border-l border-border dark:border-border-dark bg-panel dark:bg-panel-dark md:static md:z-auto md:w-[360px] md:max-w-none md:h-screen">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border dark:border-border-dark">
        <div className="flex items-center gap-2">
          <Network size={15} className="text-accent" />
          <div>
            <div className="text-[13px] font-semibold leading-none">
              Knowledge graph
            </div>
            <div className="text-[11px] text-ink-muted dark:text-ink-mutedDark mt-1">
              Compact memory · Sent in place of full history
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-1.5 rounded-md text-ink-muted dark:text-ink-mutedDark hover:bg-bg dark:hover:bg-bg-dark disabled:opacity-60"
            title="Re-extract graph from full history"
          >
            {refreshing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-muted dark:text-ink-mutedDark hover:bg-bg dark:hover:bg-bg-dark"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 bg-bg dark:bg-bg-dark">
        <canvas ref={canvasRef} className="w-full h-full block" />
        {!graph && !refreshing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-7 text-center">
            <Network size={28} className="text-ink-muted dark:text-ink-mutedDark opacity-60" />
            <div className="text-[13px] text-ink dark:text-ink-dark">
              No graph yet
            </div>
            <div className="text-[12px] text-ink-muted dark:text-ink-mutedDark leading-relaxed">
              Chat a few more turns, then the graph extracts automatically. Or hit refresh to build it now.
            </div>
          </div>
        )}
        {refreshing && (
          <div className="absolute inset-x-0 top-0 px-3 py-1.5 text-[11px] text-center bg-bg/85 dark:bg-bg-dark/85 backdrop-blur text-ink-muted dark:text-ink-mutedDark border-b border-border dark:border-border-dark">
            <span className="inline-flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" />
              Extracting graph with Haiku…
            </span>
          </div>
        )}
      </div>

      <div className="px-3.5 py-2 border-t border-border dark:border-border-dark text-[11px] text-ink-muted dark:text-ink-mutedDark flex items-center justify-between">
        <div>
          {graph
            ? `${graph.nodes.length} entities · ${graph.edges.length} edges`
            : "—"}
        </div>
        <div>
          {graph
            ? stale
              ? `Reflects ${used}/${total} msgs · refreshing soon`
              : `Reflects all ${total} msgs`
            : ""}
        </div>
      </div>
    </aside>
  );
}
