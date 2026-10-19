const API_BASE = (process.env.NEXT_PUBLIC_MAYA_API_URL || "https://maya-95qi.onrender.com").replace(/\/+$/, "");

export type ChatResult = { session_id: string; response: string };

export async function checkMayaHealth(): Promise<{ status: string; service?: string }> {
  const response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Health check failed (${response.status})`);
  return response.json();
}

export async function sendChatMessage(args: {
  message: string; sessionId: string; accessToken: string; voiceMode: boolean;
}): Promise<ChatResult> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.accessToken}` },
    body: JSON.stringify({ message: args.message, session_id: args.sessionId, voice_mode: args.voiceMode }),
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string"
      ? body.detail : `Maya API returned HTTP ${response.status}`;
    throw new Error(detail);
  }
  return body as ChatResult;
}
