const COMPLETED_STATUSES = [
    "completed",
    "concluida",
    "concluído",
    "done",
    "realizado",
    "no_show",
    "cancelled",
    "canceled",
    "cancelado"
];
const SCHEDULED_TYPES = ["activity", "meeting", "call", "email", "internal", "whatsapp"];
export function getLeadScheduleState(activities, now = new Date()) {
    if (!activities || activities.length === 0) {
        return { state: "none", nextSchedule: null, overdueCount: 0, scheduledAt: null };
    }
    const normalize = (s) => String(s || "").toLowerCase().trim();
    // Filter for valid open schedules only
    const openSchedules = activities.filter(activity => {
        // 1. Check type
        if (!SCHEDULED_TYPES.includes(activity.type))
            return false;
        // 2. Check metadata
        const meta = activity.metadata || {};
        const scheduledAtValue = meta.scheduled_at || meta.scheduled_date;
        if (!scheduledAtValue)
            return false;
        const scheduledDate = new Date(scheduledAtValue);
        if (isNaN(scheduledDate.getTime()))
            return false;
        // 3. Check status (multi-source normalization)
        const rowStatus = normalize(activity.status);
        const metadataStatus = normalize(meta.activity_status || meta.status);
        const isClosed = COMPLETED_STATUSES.includes(rowStatus) ||
            COMPLETED_STATUSES.includes(metadataStatus) ||
            !!activity.completed_at ||
            !!activity.no_show_at ||
            !!activity.cancelled_at;
        if (isClosed)
            return false;
        return true;
    });
    if (openSchedules.length === 0) {
        return { state: "none", nextSchedule: null, overdueCount: 0, scheduledAt: null };
    }
    // Map activities to their scheduled dates to avoid repeated parsing
    const activitiesWithDates = openSchedules.map(a => ({
        activity: a,
        date: new Date(a.metadata.scheduled_at || a.metadata.scheduled_date)
    }));
    const overdue = activitiesWithDates
        .filter(item => item.date <= now)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    const upcoming = activitiesWithDates
        .filter(item => item.date > now)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (overdue.length > 0) {
        return {
            state: "overdue",
            nextSchedule: overdue[0].activity,
            overdueCount: overdue.length,
            scheduledAt: overdue[0].date
        };
    }
    if (upcoming.length > 0) {
        return {
            state: "scheduled",
            nextSchedule: upcoming[0].activity,
            overdueCount: 0,
            scheduledAt: upcoming[0].date
        };
    }
    return { state: "none", nextSchedule: null, overdueCount: 0, scheduledAt: null };
}
