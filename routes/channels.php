<?php
    
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('complaint.{user_id}.send', function () {
    return true;
});
Broadcast::channel('complaint.confirmation.{user_id}', function () {
    return true;
});
Broadcast::channel('referral.{user_id}.send', function () {
    return true;
});
Broadcast::channel('referral.confirmation.{user_id}', function () {
    return true;
});
Broadcast::channel('absent-form.{user_id}.send', function() {
    return true;
});
Broadcast::channel('absent-form.confirmation.{user_id}', function() {
    return true;
});
Broadcast::channel('notify.{user_id}', function () {
    return true;
});
Broadcast::channel('call_in.{student_id}', function($student_id) {
    return true;
});
Broadcast::channel('notify.{type}', function($type) {
    return true;
});
Broadcast::channel('appointment.{user_id}.request', function () {
    return true;
});
Broadcast::channel('gatepass.{user_id}.send', function () {
    return true;
});
Broadcast::channel('gatepass.confirmation.{user_id}', function () {
    return true;
});
Broadcast::channel('job-status.progress.user.{user_id}', function () {
    return true;
});
// Presence channel (Reverb) — the member info returned here is what every
// client receives in here()/joining(), so admins can show who's online
// live without an extra HTTP request.
Broadcast::channel('online-users', function ($user) {
    $user->loadMissing('profile');

    return [
        'id' => $user->id,
        'username' => $user->username,
        'id_number' => $user->id_number,
        'role' => $user->role,
        'name' => trim(($user->profile?->first_name ?? '').' '.($user->profile?->last_name ?? '')) ?: $user->username,
        'profile_picture' => $user->profile?->profile_picture,
        'sex' => $user->profile?->sex,
    ];
});
// Only the owner may listen on their own chat channel.
Broadcast::channel('chat.{user_id}', function ($user, $user_id) {
    return (int) $user->id === (int) $user_id;
});

// A program's teacher group chat — only that program's teaching staff.
Broadcast::channel('program-chat.{programId}', function ($user, $programId) {
    return $user->role === 'teaching_staff'
        && \App\Models\TeachingStaff::programIdsFor($user->id)->contains((int) $programId);
});
