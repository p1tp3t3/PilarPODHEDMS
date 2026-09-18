<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;
use ZipArchive;

class BackupController extends Controller
{
    public function index()
    {
        $files = collect(File::files($this->backupDir()))
            ->map(function ($f) {
                $name = $f->getFilename();

                return [
                    'name' => $name,
                    'size' => $f->getSize(),
                    'created_at' => date('Y-m-d H:i:s', $f->getMTime()),
                    'type' => str_starts_with($name, 'db-backup-')
                        ? 'database'
                        : (str_starts_with($name, 'storage-backup-') ? 'storage' : 'full'),
                ];
            })
            ->sortByDesc('created_at')
            ->values();

        return response()->json(['backups' => $files]);
    }

    public function createDatabaseBackup()
    {
        set_time_limit(600);

        try {
            $path = $this->dumpDatabase();

            return response()->json([
                'message' => 'Database backup created successfully.',
                'file' => basename($path),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Database backup failed: '.$e->getMessage()], 500);
        }
    }

    public function createStorageBackup()
    {
        set_time_limit(600);

        try {
            $path = $this->zipStorage();

            return response()->json([
                'message' => 'Storage backup created successfully.',
                'file' => basename($path),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Storage backup failed: '.$e->getMessage()], 500);
        }
    }

    public function createFullBackup()
    {
        set_time_limit(900);

        try {
            $dbPath = $this->dumpDatabase();
            $timestamp = now()->format('Y-m-d_His');
            $zipPath = $this->backupDir()."/full-backup-{$timestamp}.zip";

            $zip = new ZipArchive;
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \Exception('Unable to create backup archive.');
            }

            $zip->addFile($dbPath, 'database/'.basename($dbPath));
            $this->addDirectoryToZip($zip, storage_path('app'), 'storage');
            $zip->close();

            // the standalone dump was only needed to fold into the zip
            File::delete($dbPath);

            return response()->json([
                'message' => 'Full system backup created successfully.',
                'file' => basename($zipPath),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Full system backup failed: '.$e->getMessage()], 500);
        }
    }

    public function download($filename)
    {
        $filename = basename($filename);
        $path = $this->backupDir().'/'.$filename;

        if (! File::exists($path)) {
            abort(404);
        }

        return response()->download($path);
    }

    public function destroy($filename)
    {
        $filename = basename($filename);
        $path = $this->backupDir().'/'.$filename;

        if (File::exists($path)) {
            File::delete($path);
        }

        return response()->json(['message' => 'Backup deleted successfully.']);
    }

    private function backupDir(): string
    {
        $dir = storage_path('app/private/backups');

        if (! File::exists($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }

        return $dir;
    }

    private function dumpDatabase(): string
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        $timestamp = now()->format('Y-m-d_His');
        $path = $this->backupDir()."/db-backup-{$timestamp}.sql";

        $command = [
            'mysqldump',
            '-h', $config['host'],
            '-P', (string) $config['port'],
            '-u', $config['username'],
            '--single-transaction',
            '--routines',
            $config['database'],
        ];

        $process = new Process($command);
        $process->setTimeout(600);

        if (! empty($config['password'])) {
            $process->setEnv(['MYSQL_PWD' => $config['password']]);
        }

        $process->run();

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        File::put($path, $process->getOutput());

        return $path;
    }

    private function zipStorage(): string
    {
        $timestamp = now()->format('Y-m-d_His');
        $zipPath = $this->backupDir()."/storage-backup-{$timestamp}.zip";

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \Exception('Unable to create backup archive.');
        }

        $this->addDirectoryToZip($zip, storage_path('app'), 'storage');
        $zip->close();

        return $zipPath;
    }

    /**
     * Recursively add a directory to a zip, skipping the backups folder
     * itself so a backup never gets zipped into another backup.
     */
    private function addDirectoryToZip(ZipArchive $zip, string $sourceDir, string $zipRoot): void
    {
        $sourceDir = rtrim($sourceDir, '/\\');

        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($sourceDir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $file) {
            if ($file->isDir()) {
                continue;
            }

            $filePath = $file->getRealPath();

            if (str_contains($filePath, DIRECTORY_SEPARATOR.'backups'.DIRECTORY_SEPARATOR)) {
                continue;
            }

            $relativePath = $zipRoot.'/'.substr($filePath, strlen($sourceDir) + 1);
            $zip->addFile($filePath, $relativePath);
        }
    }
}
