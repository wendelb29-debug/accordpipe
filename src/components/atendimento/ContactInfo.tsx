import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WhatsAppContact, mockLabels, channelMeta } from "./mock-data";
import { ChannelIcon } from "./ChannelIcon";
import { cn } from "@/lib/utils";

interface ContactInfoProps {
  contact: WhatsAppContact;
  onClose: () => void;
}

const avatarColors = [
  "bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-teal-600", "bg-indigo-600", "bg-pink-600",
];

export function ContactInfo({ contact, onClose }: ContactInfoProps) {
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const getAvatarColor = (id: string) => {
    const idx = parseInt(id, 10) % avatarColors.length || 0;
    return avatarColors[idx];
  };

  return (
    <div className="w-[320px] border-l border-[#e9edef] dark:border-[#222d34] bg-white dark:bg-[#111b21] flex flex-col h-full">
      {/* Header */}
      <div className="h-[56px] flex items-center gap-4 px-4 border-b border-[#e9edef] dark:border-[#222d34]">
        <Button size="icon" variant="ghost" className="h-8 w-8 text-[#54656f]" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <span className="text-[14px] font-medium text-[#111b21] dark:text-[#e9edef]">
          Dados do contato
        </span>
      </div>

      <ScrollArea className="flex-1">
        {/* Avatar section */}
        <div className="py-6 flex flex-col items-center border-b border-[#e9edef]/60">
          <Avatar className="h-[120px] w-[120px] mb-3">
            <AvatarFallback className={cn("text-white text-3xl font-medium", getAvatarColor(contact.id))}>
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-lg font-medium text-[#111b21] dark:text-[#e9edef]">
            {contact.name}
          </h3>
          <p className="text-[13px] text-[#667781] mt-0.5">{contact.phone}</p>
        </div>

        {/* Channels */}
        <div className="px-5 py-4 border-b border-[#e9edef]/60">
          <p className="text-[12px] text-[#667781] uppercase tracking-wide mb-2">Canais</p>
          <div className="flex flex-wrap gap-2">
            {contact.channels.map((ch) => (
              <span
                key={ch}
                className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full"
                style={{ color: channelMeta[ch].color, backgroundColor: channelMeta[ch].bg }}
              >
                <ChannelIcon channel={ch} size={12} />
                {channelMeta[ch].name}
              </span>
            ))}
          </div>
        </div>

        {/* Labels */}
        {contact.labels.length > 0 && (
          <div className="px-5 py-4 border-b border-[#e9edef]/60">
            <p className="text-[12px] text-[#667781] uppercase tracking-wide mb-2">Etiquetas</p>
            <div className="flex flex-wrap gap-2">
              {contact.labels.map((labelId) => {
                const label = mockLabels.find((l) => l.id === labelId);
                if (!label) return null;
                return (
                  <span
                    key={labelId}
                    className="text-[11px] px-2 py-0.5 rounded text-white font-medium"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Assigned */}
        {contact.assignedTo && (
          <div className="px-5 py-4">
            <p className="text-[12px] text-[#667781] uppercase tracking-wide mb-1">Atribuído a</p>
            <p className="text-[13px] text-[#111b21] dark:text-[#e9edef]">{contact.assignedTo}</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
