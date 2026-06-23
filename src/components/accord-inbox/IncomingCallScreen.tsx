import { useIncomingWhatsappCalls } from "@/hooks/useIncomingWhatsappCalls";
import { Phone, PhoneOff } from "lucide-react";

export function IncomingCallScreen() {
  const { incomingCall, isRinging, acceptCall, rejectCall } = useIncomingWhatsappCalls();

  if (!incomingCall || !isRinging) return null;

  const displayName = incomingCall.caller_name || incomingCall.phone;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
        {incomingCall.caller_avatar ? (
          <img
            src={incomingCall.caller_avatar}
            alt={displayName}
            className="w-24 h-24 rounded-full mx-auto mb-5 object-cover ring-4 ring-emerald-500/30"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto mb-5 flex items-center justify-center ring-4 ring-emerald-500/30 animate-pulse">
            <Phone size={40} />
          </div>
        )}

        <h2 className="text-2xl font-bold text-foreground mb-1 truncate">{displayName}</h2>
        <p className="text-sm text-muted-foreground mb-1">{incomingCall.phone}</p>
        <p className="text-emerald-500 font-medium mb-8 animate-pulse">Chamada WhatsApp recebida...</p>

        <div className="flex gap-6 justify-center">
          <button
            onClick={() => rejectCall(incomingCall.call_id, incomingCall.phone)}
            className="flex flex-col items-center gap-2 group"
            aria-label="Rejeitar"
          >
            <span className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg group-active:scale-95 transition">
              <PhoneOff size={28} />
            </span>
            <span className="text-xs text-muted-foreground">Rejeitar</span>
          </button>

          <button
            onClick={() => acceptCall(incomingCall.call_id)}
            className="flex flex-col items-center gap-2 group"
            aria-label="Aceitar"
          >
            <span className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg group-active:scale-95 transition animate-pulse">
              <Phone size={28} />
            </span>
            <span className="text-xs text-muted-foreground">Aceitar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
