import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  /** Show time selector */
  showTime?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Disable the picker */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Min date */
  minDate?: Date;
  /** Max date */
  maxDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  showTime = true,
  placeholder = "Selecionar data",
  disabled = false,
  className,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const hours = value ? String(value.getHours()).padStart(2, "0") : "00";
  const minutes = value ? String(value.getMinutes()).padStart(2, "0") : "00";

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) {
      onChange?.(undefined);
      return;
    }
    // Preserve existing time when selecting a new date
    const newDate = new Date(day);
    if (value) {
      newDate.setHours(value.getHours(), value.getMinutes(), 0, 0);
    }
    onChange?.(newDate);
    if (!showTime) setOpen(false);
  };

  const handleTimeChange = (type: "hours" | "minutes", val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const base = value ? new Date(value) : new Date();
    if (!value) {
      // If no date selected yet, use today
      base.setHours(0, 0, 0, 0);
    }
    if (type === "hours") {
      base.setHours(Math.max(0, Math.min(23, num)));
    } else {
      base.setMinutes(Math.max(0, Math.min(59, num)));
    }
    onChange?.(base);
  };

  const handleHourScroll = (direction: 1 | -1) => {
    const base = value ? new Date(value) : new Date();
    base.setHours((base.getHours() + direction + 24) % 24);
    onChange?.(base);
  };

  const handleMinuteScroll = (direction: 1 | -1) => {
    const base = value ? new Date(value) : new Date();
    const newMin = base.getMinutes() + direction * 5;
    base.setMinutes(((newMin % 60) + 60) % 60);
    onChange?.(base);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? (
            <span className="truncate">
              {format(value, showTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy", { locale: ptBR })}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          locale={ptBR}
          initialFocus
          className="pointer-events-auto"
        />
        {showTime && (
          <div className="flex items-center justify-center gap-2 border-t px-4 py-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleHourScroll(1)}
                  className="text-xs text-muted-foreground hover:text-foreground p-0.5"
                >
                  ▲
                </button>
                <Input
                  className="h-8 w-12 text-center text-sm px-1"
                  value={hours}
                  onChange={(e) => handleTimeChange("hours", e.target.value)}
                  maxLength={2}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => handleHourScroll(-1)}
                  className="text-xs text-muted-foreground hover:text-foreground p-0.5"
                >
                  ▼
                </button>
              </div>
              <span className="text-lg font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleMinuteScroll(1)}
                  className="text-xs text-muted-foreground hover:text-foreground p-0.5"
                >
                  ▲
                </button>
                <Input
                  className="h-8 w-12 text-center text-sm px-1"
                  value={minutes}
                  onChange={(e) => handleTimeChange("minutes", e.target.value)}
                  maxLength={2}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => handleMinuteScroll(-1)}
                  className="text-xs text-muted-foreground hover:text-foreground p-0.5"
                >
                  ▼
                </button>
              </div>
            </div>
            <Button
              size="sm"
              variant="default"
              className="ml-2 h-8 text-xs"
              onClick={() => setOpen(false)}
            >
              OK
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
