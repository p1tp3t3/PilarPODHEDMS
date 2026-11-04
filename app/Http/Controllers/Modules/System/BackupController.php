<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use App\Models\ActionLog;
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
                    'type' => $this->typeOf($name),
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
            $zipPath = $this->zipFullSystem();

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

    /**
     * Put a backup back into the system: a database backup replaces the
     * database, a storage backup replaces the uploaded/generated files, and
     * a full backup does both. A backup of the current state, of the same
     * kind, is made first so the restore itself can be undone.
     */
    public function restore($filename)
    {
        set_time_limit(1800);

        $filename = basename($filename);
        $path = $this->backupDir().'/'.$filename;

        if (! File::exists($path)) {
            return response()->json(['message' => 'Backup not found.'], 404);
        }

        $type = $this->typeOf($filename);

        try {
            // Named apart from regular backups so it can never overwrite the
            // backup being restored, even when both are from the same second.
            $suffix = '-before-restore';
            $safety = match ($type) {
                'database' => $this->dumpDatabase($suffix),
                'storage' => $this->zipStorage($suffix),
                default => $this->zipFullSystem($suffix),
            };

            if ($type === 'database') {
                $this->restoreDatabase($path);
            } else {
                $zip = new ZipArchive;
                if ($zip->open($path) !== true) {
                    throw new \Exception('Unable to open the backup archive.');
                }

                if ($type === 'full') {
                    $sql = $this->extractDatabaseDump($zip);
                    try {
                        $this->restoreDatabase($sql);
                    } finally {
                        File::delete($sql);
                    }
                }

                $this->restoreStorage($zip);
                $zip->close();
            }

            ActionLog::log(
                auth()->id(),
                'system',
                "Restored the system from backup {$filename}",
                ['backup' => ['from' => basename($safety), 'to' => $filename]]
            );

            return response()->json([
                'message' => 'Backup restored successfully.',
                'safety_backup' => basename($safety),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Restore failed: '.$e->getMessage()], 500);
        }
    }

    private function typeOf(string $name): string
    {
        return str_starts_with($name, 'db-backup-')
            ? 'database'
            : (str_starts_with($name, 'storage-backup-') ? 'storage' : 'full');
    }

    private function zipFullSystem(string $suffix = ''): string
    {
        // Dumped under its own name so it can't clash with (and then delete)
        // a database backup made in the same second.
        $dbPath = $this->dumpDatabase('-for-full-backup');
        $timestamp = now()->format('Y-m-d_His');
        $zipPath = $this->backupDir()."/full-backup-{$timestamp}{$suffix}.zip";

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \Exception('Unable to create backup archive.');
        }

        $zip->addFile($dbPath, 'database/'.basename($dbPath));
        $this->addDirectoryToZip($zip, storage_path('app'), 'storage');
        $zip->close();

        // the standalone dump was only needed to fold into the zip
        File::delete($dbPath);

        return $zipPath;
    }

    // Tables left as they are now: restoring them would sign everyone out
    // (sessions) or bring back stale cache entries such as maintenance mode.
    private const KEEP_TABLES = ['sessions', 'cache', 'cache_locks'];

    /**
     * Run a mysqldump file through the mysql client, without the
     * KEEP_TABLES blocks (mysqldump starts each table's block with a
     * "-- Table structure for table `x`" comment).
     */
    private function restoreDatabase(string $sqlPath): void
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        $filtered = tempnam(sys_get_temp_dir(), 'restore-');
        $in = fopen($sqlPath, 'r');
        $out = fopen($filtered, 'w');
        $skip = false;
        while (($line = fgets($in)) !== false) {
            if (preg_match('/^-- (?:Table structure|Dumping data) for table `([^`]+)`/', $line, $m)) {
                $skip = in_array($m[1], self::KEEP_TABLES, true);
            }
            if (! $skip) {
                fwrite($out, $line);
            }
        }
        fclose($in);
        fclose($out);

        try {
            $input = fopen($filtered, 'r');
            $process = new Process([
                'mysql',
                '-h', $config['host'],
                '-P', (string) $config['port'],
                '-u', $config['username'],
                $config['database'],
            ]);
            $process->setTimeout(1800);
            $process->setInput($input);
            $process->setEnv($this->mysqlEnv($config));
            $process->run();
            fclose($input);

            if (! $process->isSuccessful()) {
                throw new ProcessFailedException($process);
            }
        } finally {
            File::delete($filtered);
        }
    }

    // A full backup holds its dump at database/<name>.sql.
    private function extractDatabaseDump(ZipArchive $zip): string
    {
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (str_starts_with($name, 'database/') && str_ends_with($name, '.sql')) {
                $tmp = tempnam(sys_get_temp_dir(), 'restore-sql-');
                File::put($tmp, $zip->getFromIndex($i));

                return $tmp;
            }
        }

        throw new \Exception('The backup archive has no database dump.');
    }

    /**
     * Replace storage/app with the archive's storage/ folder. The backups
     * folder is never touched, so the backups (and the safety backup just
     * made) survive.
     */
    private function restoreStorage(ZipArchive $zip): void
    {
        $entries = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = str_replace('\\', '/', $zip->getNameIndex($i));
            if (! str_starts_with($name, 'storage/') || str_ends_with($name, '/')) {
                continue;
            }
            $relative = substr($name, strlen('storage/'));
            // never write outside storage/app, never into the backups folder
            if (str_contains($relative, '..') || str_starts_with($relative, 'private/backups/')) {
                continue;
            }
            $entries[$i] = $relative;
        }

        if (! $entries) {
            throw new \Exception('The backup archive has no storage files.');
        }

        $root = storage_path('app');
        foreach (File::allFiles($root, true) as $file) {
            $path = str_replace('\\', '/', $file->getPathname());
            if (! str_contains($path, '/private/backups/') && $file->getFilename() !== '.gitignore') {
                File::delete($file->getPathname());
            }
        }

        foreach ($entries as $i => $relative) {
            $target = $root.'/'.$relative;
            File::ensureDirectoryExists(dirname($target));
            File::put($target, $zip->getFromIndex($i));
        }
    }

    /**
     * Environment for the mysql/mysqldump processes. Under a web server
     * (e.g. `php artisan serve`) PHP gets a trimmed environment, and on
     * Windows a child started without SystemRoot can't open a network
     * socket ("Can't create TCP/IP socket (10106)"), so the variables
     * Windows needs are passed explicitly.
     */
    private function mysqlEnv(array $config): array
    {
        $env = [];

        if (PHP_OS_FAMILY === 'Windows') {
            $systemRoot = getenv('SystemRoot') ?: getenv('SYSTEMROOT') ?: getenv('windir') ?: 'C:\Windows';
            $env['SystemRoot'] = $systemRoot;
            $env['windir'] = getenv('windir') ?: $systemRoot;
            $env['TEMP'] = getenv('TEMP') ?: sys_get_temp_dir();
            $env['TMP'] = getenv('TMP') ?: sys_get_temp_dir();
        }

        if (! empty($config['password'])) {
            $env['MYSQL_PWD'] = $config['password'];
        }

        return $env;
    }

    private function backupDir(): string
    {
        $dir = storage_path('app/private/backups');

        if (! File::exists($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }

        return $dir;
    }

    private function dumpDatabase(string $suffix = ''): string
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        $timestamp = now()->format('Y-m-d_His');
        $path = $this->backupDir()."/db-backup-{$timestamp}{$suffix}.sql";

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

        $process->setEnv($this->mysqlEnv($config));

        $process->run();

        if (! $process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        File::put($path, $process->getOutput());

        return $path;
    }

    private function zipStorage(string $suffix = ''): string
    {
        $timestamp = now()->format('Y-m-d_His');
        $zipPath = $this->backupDir()."/storage-backup-{$timestamp}{$suffix}.zip";

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
