package com.unyt.legion.notification;

import com.unyt.legion.user.AppUser;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    public void notify(AppUser user, String type, String message) {
        notifications.save(new Notification(user, type, message));
    }
}
