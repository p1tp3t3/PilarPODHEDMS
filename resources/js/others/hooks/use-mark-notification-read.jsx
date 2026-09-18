import { useEffect } from "react"
import { NotificationService } from "@/others/services/notification-service"

// Every notification-related page is reached by clicking a notification,
// whose link carries the notification's own id as ?id=... — landing on any
// of these pages means the user has just read it. Previously handled once,
// centrally, by NotifDisplayLayout; each page now calls this itself since
// they moved to the standard sidebar layout (AuthLayout), which knows
// nothing about notifications.
export const useMarkNotificationRead = () => {
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('id')

        if (id != null) {
            NotificationService.markOneRead(id)
        }
    }, [])
}
