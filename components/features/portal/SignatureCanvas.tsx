"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  width?: number;
  height?: number;
  onChange?: (dataUrl: string | null) => void;
};

/**
 * Pad de assinatura por desenho — mouse + touch + pointer.
 * Devolve `dataUrl` (image/png base64) via onChange quando a assinatura
 * está completa, ou null quando o pad está limpo.
 */
export function SignatureCanvas({ width = 480, height = 160, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function pointFromEvent(e: PointerEvent | React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ev = "nativeEvent" in e ? e.nativeEvent : e;
    return {
      x: ((ev.clientX - rect.left) * canvas.width) / rect.width,
      y: ((ev.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function moveStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = pointFromEvent(e);
    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPointRef.current = p;
  }

  function endStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    setHasSignature(true);
    onChange?.(canvasRef.current?.toDataURL("image/png") ?? null);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange?.(null);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        className="w-full max-w-full touch-none rounded border border-zinc-300 bg-white dark:border-zinc-700"
        style={{ aspectRatio: `${width} / ${height}` }}
        aria-label="Pad de assinatura"
      />
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{hasSignature ? "Assinado" : "Desenhe sua assinatura acima"}</span>
        <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!hasSignature}>
          Limpar
        </Button>
      </div>
    </div>
  );
}
