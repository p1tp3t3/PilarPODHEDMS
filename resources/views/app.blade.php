<?php
$androidIconList = [
    ['size' => '16x16', 'path' => '/pwa2/android/16.png'],
    ['size' => '24x24', 'path' => '/pwa2/android/24.png'],
    ['size' => '32x32', 'path' => '/pwa2/android/32.png'],
    ['size' => '36x36', 'path' => '/pwa2/android/36.png'],
    ['size' => '48x48', 'path' => '/pwa2/android/48.png'],
    ['size' => '72x72', 'path' => '/pwa2/android/72.png'],
    ['size' => '96x96', 'path' => '/pwa2/android/96.png'],
    ['size' => '144x144', 'path' => '/pwa2/android/144.png'],
    ['size' => '192x192', 'path' => '/pwa2/android/192.png'],
    ['size' => '256x256', 'path' => '/pwa2/android/256.png'],
    ['size' => '384x384', 'path' => '/pwa2/android/384.png'],
    ['size' => '512x512', 'path' => '/pwa2/android/512.png'],
];
$iosIconList = [
    ['size' => '16x16', 'path' => '/pwa2/ios/16.png'],
    ['size' => '20x20', 'path' => '/pwa2/ios/20.png'],
    ['size' => '29x29', 'path' => '/pwa2/ios/29.png'],
    ['size' => '40x40', 'path' => '/pwa2/ios/40.png'],
    ['size' => '50x50', 'path' => '/pwa2/ios/50.png'],
    ['size' => '57x57', 'path' => '/pwa2/ios/57.png'],
    ['size' => '60x60', 'path' => '/pwa2/ios/60.png'],
    ['size' => '72x72', 'path' => '/pwa2/ios/72.png'],
    ['size' => '76x76', 'path' => '/pwa2/ios/76.png'],
    ['size' => '120x120', 'path' => '/pwa2/ios/120.png'],
    ['size' => '152x152', 'path' => '/pwa2/ios/152.png'],
    ['size' => '167x167', 'path' => '/pwa2/ios/167.png'],
    ['size' => '180x180', 'path' => '/pwa2/ios/180.png'],
    ['size' => '192x192', 'path' => '/pwa2/ios/192.png'],
    ['size' => '256x256', 'path' => '/pwa2/ios/256.png'],
    ['size' => '512x512', 'path' => '/pwa2/ios/512.png'],
    ['size' => '1024x1024', 'path' => '/pwa2/ios/1024.png'],
];
$windowsIconList = [
    ['size' => '44x44', 'path' => '/pwa2/windows/Square44x44Logo.scale-100.png'],
    ['size' => '71x71', 'path' => '/pwa2/windows/SmallTile.scale-100.png'],
    ['size' => '150x150', 'path' => '/pwa2/windows/Square150x150Logo.scale-100.png'],
    ['size' => '310x150', 'path' => '/pwa2/windows/Wide310x150Logo.scale-100.png'],
    ['size' => '310x310', 'path' => '/pwa2/windows/LargeTile.scale-100.png'],
    ['size' => '620x300', 'path' => '/pwa2/windows/SplashScreen.scale-100.png'],
    ['size' => '256x256', 'path' => '/pwa2/windows/Square44x44Logo.targetsize-256.png'],
];

?>
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <link rel="icon" href="/default-pic/pilar.png" type="image/x-icon">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- PWA -->
        <meta name="theme-color" content="#111827">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="POD System">
        <link rel="manifest" href="/manifest.json"/>
        @foreach ($iosIconList as $icon)
            <link rel="apple-touch-icon" sizes="{{ $icon['size'] }}" href="{{ $icon['path'] }}">
        @endforeach

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased bg-gray-100">
        @inertia
    </body>
</html>
