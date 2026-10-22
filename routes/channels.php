<?php

use App\Broadcasting\ChannelAuth;
use Illuminate\Support\Facades\Broadcast;

/*
| Every private/presence channel is guarded. Subscribing goes through
| /broadcasting/auth, which runs the web + auth + activate middleware
| (bootstrap/app.php); the rule on each channel below then decides whether
| that user may listen to it. See App\Broadcasting\ChannelAuth.
|
| The only public channel is "maintenance" (MaintenanceModeToggled): guests
| on the login and maintenance pages need it to reload when maintenance
| ends, and it carries nothing but { enabled }.
*/

// Per-user channels: only the user named in the channel.
Broadcast::channel('notify.{user_id}', ChannelAuth::owner());
Broadcast::channel('chat.{user_id}', ChannelAuth::owner());
Broadcast::channel('job-status.progress.user.{user_id}', ChannelAuth::owner());
Broadcast::channel('call_in.{user_id}', ChannelAuth::owner());
Broadcast::channel('complaint.{user_id}.send', ChannelAuth::owner());
Broadcast::channel('complaint.confirmation.{user_id}', ChannelAuth::owner());
Broadcast::channel('referral.{user_id}.send', ChannelAuth::owner());
Broadcast::channel('referral.confirmation.{user_id}', ChannelAuth::owner());
Broadcast::channel('absent-form.{user_id}.send', ChannelAuth::owner());
Broadcast::channel('absent-form.confirmation.{user_id}', ChannelAuth::owner());
Broadcast::channel('appointment.{user_id}.request', ChannelAuth::owner());
Broadcast::channel('appointment.{user_id}.confirmation', ChannelAuth::owner());
Broadcast::channel('gatepass.{user_id}.send', ChannelAuth::owner());
Broadcast::channel('gatepass.confirmation.{user_id}', ChannelAuth::owner());

// Gate pass approvals feed for the verification page (guards and admins).
Broadcast::channel('gate-pass-approvals', ChannelAuth::gatePassVerifiers());

// Presence channel (Reverb) for the live online-users list.
Broadcast::channel('online-users', ChannelAuth::presence());
