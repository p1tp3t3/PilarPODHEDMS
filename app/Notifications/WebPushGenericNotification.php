<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class WebPushGenericNotification extends Notification
{
    use Queueable;

    public function __construct(protected array $payload)
    {
    }

    public function via($notifiable): array
    {
        return [WebPushChannel::class];
    }

    public function toWebPush($notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage())
            ->title($this->payload['title'])
            ->icon($this->payload['icon'] ?? '/default-pic/pilar.png')
            ->body($this->payload['body'])
            ->data(['url' => $this->payload['url'] ?? '/'])
            ->options(['TTL' => 300]);
    }
}
