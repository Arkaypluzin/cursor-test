export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

let notificationListeners: ((notifications: Notification[]) => void)[] = [];
let notifications: Notification[] = [];

export function subscribeToNotifications(callback: (notifications: Notification[]) => void) {
  notificationListeners.push(callback);
  callback(notifications);
  
  return () => {
    notificationListeners = notificationListeners.filter(listener => listener !== callback);
  };
}

function notifyListeners() {
  notificationListeners.forEach(listener => listener([...notifications]));
}

export function showNotification(message: string, type: NotificationType = 'info') {
  const id = Math.random().toString(36).substring(7);
  const notification: Notification = { id, message, type };
  
  notifications.push(notification);
  notifyListeners();

  // Auto-remove after 5 seconds
  setTimeout(() => {
    removeNotification(id);
  }, 5000);
}

export function removeNotification(id: string) {
  notifications = notifications.filter(n => n.id !== id);
  notifyListeners();
}
