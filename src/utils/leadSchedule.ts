import { ActivityItem } from "@/components/atendimento/LeadAtividadesTab";

export type LeadScheduleState = "none" | "scheduled" | "overdue";

export interface LeadScheduleResult {
  state: LeadScheduleState;
  nextSchedule: ActivityItem | null;
  overdueCount: number;
}

const COMPLETED_STATUSES = ["completed", "concluida", "done", "realizado", "concluído", "no_show"];
const CANCELLED_STATUSES = ["cancelled", "canceled", "cancelado"];

export function getLeadScheduleState(activities: ActivityItem[], now: Date = new Date()): LeadScheduleResult {
  if (!activities || activities.length === 0) {
    return { state: "none", nextSchedule: null, overdueCount: 0 };
  }

  // Filter for valid open schedules only
  const openSchedules = activities.filter(activity => {
    // Only activities with specific types are considered "scheduled"
    const scheduledTypes = ["activity", "meeting", "call", "email", "internal", "whatsapp"];
    if (!scheduledTypes.includes(activity.type)) return false;

    const meta = activity.metadata || {};
    const status = (activity.status || meta.activity_status || "").toLowerCase();
    
    // Check if it's explicitly completed/cancelled/no-show
    if (COMPLETED_STATUSES.includes(status)) return false;
    if (activity.completed_at) return false;
    if (activity.no_show_at) return false;
    if (CANCELLED_STATUSES.includes(status)) return false;

    // Must have a scheduled date
    const scheduledAt = meta.scheduled_at || meta.scheduled_date;
    return !!scheduledAt;
  });

  if (openSchedules.length === 0) {
    return { state: "none", nextSchedule: null, overdueCount: 0 };
  }

  // Calculate overdue and upcoming
  const overdue = openSchedules
    .filter(a => {
      const scheduledAtStr = a.metadata.scheduled_at || a.metadata.scheduled_date;
      return new Date(scheduledAtStr) <= now;
    })
    .sort((a, b) => {
      // Oldest overdue first
      const dateA = new Date(a.metadata.scheduled_at || a.metadata.scheduled_date).getTime();
      const dateB = new Date(b.metadata.scheduled_at || b.metadata.scheduled_date).getTime();
      return dateA - dateB;
    });

  const upcoming = openSchedules
    .filter(a => {
      const scheduledAtStr = a.metadata.scheduled_at || a.metadata.scheduled_date;
      return new Date(scheduledAtStr) > now;
    })
    .sort((a, b) => {
      // Soonest upcoming first
      const dateA = new Date(a.metadata.scheduled_at || a.metadata.scheduled_date).getTime();
      const dateB = new Date(b.metadata.scheduled_at || b.metadata.scheduled_date).getTime();
      return dateA - dateB;
    });

  if (overdue.length > 0) {
    return {
      state: "overdue",
      nextSchedule: overdue[0], // Most overdue first
      overdueCount: overdue.length
    };
  }

  if (upcoming.length > 0) {
    return {
      state: "scheduled",
      nextSchedule: upcoming[0], // Soonest future one
      overdueCount: 0
    };
  }

  return { state: "none", nextSchedule: null, overdueCount: 0 };
}
