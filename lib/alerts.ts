import { Alert } from "./types";

let alertsMemory: Alert[] = [];

export async function fetchAlerts(userId: string): Promise<Alert[]> {
    return alertsMemory.filter(a => a.userId === userId);
}

export async function markAlertAsRead(alertId: string): Promise<void> {
    const alert = alertsMemory.find(a => a.id === alertId);
    if (alert) {
        alert.isRead = true;
    }
}

export async function markAllAlertsAsRead(userId: string): Promise<void> {
    alertsMemory.forEach(a => {
        if (a.userId === userId) {
            a.isRead = true;
        }
    });
}

export async function createAlert(data: Omit<Alert, "id" | "createdAt">): Promise<string> {
    const id = crypto.randomUUID();
    const newAlert: Alert = {
        ...data,
        id,
        isRead: false,
        createdAt: new Date().toISOString()
    };
    alertsMemory.unshift(newAlert);
    return id;
}
