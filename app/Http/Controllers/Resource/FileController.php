<?php

namespace App\Http\Controllers\Resource;

use App\Http\Controllers\Controller;
use App\Models\Position;
use App\Models\TeachingStaff;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\TemplateProcessor;
use ZipArchive;

class FileController extends Controller
{
    public function getDocument($type, $username, $fileName)
    {
        $path = self::getUserAssets($username, $type);
        $file = "$path/$fileName";

        if (! file_exists($file)) {
            abort(404);
        }

        $mime = mime_content_type($file);

        return response()->file($file, ['Content-Type' => $mime]);
    }

    public function getProfilePicture()
    {
        $decrypt = self::cryptoJsAesDecrypt($_GET['ref']);
        $path = storage_path("app/private/user-assets/$decrypt/profile-$decrypt.jpg");

        if (! file_exists($path)) {
            abort(404);
        }

        $mimeType = mime_content_type($path);

        return response()->file($path, [
            'Content-Type' => $mimeType,
        ]);
    }

    public function getUserAssets($username, $type)
    {
        $userFolder = storage_path("app/private/user-assets/$username");
        switch ($type) {
            case 'complaint':
                return "$userFolder/complaint";
            case 'gatepass':
                return "$userFolder/gatepass";
            case 'profile':
                return "$userFolder/profile";
        }
    }

    public function downloadAccountFile($fileName)
    {
        self::authorizeAccountFile($fileName);

        $filePath = Storage::disk('local')->path("zips/$fileName");

        return response()->download($filePath);
    }

    /**
     * Preview a default-account file's contents. A .csv is parsed straight
     * to rows; a .zip is opened and its entry names are listed so the
     * caller can then request one via previewZipEntry().
     */
    public function previewAccountFile($fileName)
    {
        self::authorizeAccountFile($fileName);

        $path = Storage::disk('local')->path("zips/$fileName");
        if (! file_exists($path)) {
            abort(404);
        }

        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if ($extension === 'csv') {
            return response()->json([
                'type' => 'csv',
                'rows' => self::parseAccountCsvContents(file_get_contents($path)),
            ]);
        }

        if ($extension === 'zip') {
            $zip = new ZipArchive;
            if ($zip->open($path) !== true) {
                abort(500, 'Unable to open zip file.');
            }

            $entries = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $entries[] = $zip->getNameIndex($i);
            }
            $zip->close();

            return response()->json(['type' => 'zip', 'entries' => $entries]);
        }

        abort(415, 'Unsupported file type.');
    }

    /**
     * Preview one CSV entry inside a .zip default-account file.
     */
    public function previewAccountFileEntry($fileName, Request $request)
    {
        self::authorizeAccountFile($fileName);

        $entry = $request->query('entry');
        if (! $entry || strtolower(pathinfo($entry, PATHINFO_EXTENSION)) !== 'csv') {
            abort(400, 'A csv entry name is required.');
        }

        $path = Storage::disk('local')->path("zips/$fileName");
        $zip = new ZipArchive;
        if (! file_exists($path) || $zip->open($path) !== true || $zip->locateName($entry) === false) {
            abort(404);
        }

        $contents = $zip->getFromName($entry);
        $zip->close();

        return response()->json([
            'type' => 'csv',
            'rows' => self::parseAccountCsvContents($contents),
        ]);
    }

    /**
     * Parses a default-account CSV (header row + id/name/program/.../password
     * rows) and re-resolves each row's name from the live profiles table via
     * its id_number — the CSV's own "name" column is only a snapshot from
     * generation time and can go stale once a profile is edited.
     */
    private function parseAccountCsvContents($contents)
    {
        $lines = array_filter(preg_split('/\r\n|\r|\n/', trim($contents ?? '')), fn ($l) => $l !== '');
        $rows = array_map('str_getcsv', $lines);

        $header = array_map('trim', array_shift($rows) ?? []);

        $parsedRows = array_map(function ($line) use ($header) {
            $row = [];
            foreach ($header as $i => $key) {
                $row[$key] = $line[$i] ?? null;
            }

            return $row;
        }, $rows);

        $idNumbers = array_filter(array_column($parsedRows, 'id'));
        $users = User::whereIn('id_number', $idNumbers)
            ->with('profile')
            ->get()
            ->keyBy(fn ($u) => strtolower($u->id_number));

        return array_map(function ($row) use ($users) {
            $user = $users->get(strtolower($row['id'] ?? ''));

            $row['name'] = $user
                ? trim("{$user->profile?->first_name} {$user->profile?->middle_name} {$user->profile?->last_name}")
                : ($row['name'] ?? null);
            $row['username'] = $user->username ?? ($row['username'] ?? null);

            return $row;
        }, $parsedRows);
    }

    /**
     * A program head may only reach files belonging to their own program —
     * super_admin/sub_admin are trusted with every file.
     */
    private function authorizeAccountFile($fileName)
    {
        $user = auth()->user();

        if (in_array($user->role, ['super_admin', 'sub_admin'])) {
            return;
        }

        if ($user->role === 'teaching_staff') {
            $programIds = self::programHeadProgramIds($user);

            if (! empty($programIds)) {
                $pattern = '/^(student|faculty-account)-('.implode('|', array_map('preg_quote', $programIds)).')-/';

                if (preg_match($pattern, basename($fileName))) {
                    return;
                }
            }
        }

        abort(403);
    }

    /**
     * Every program_id the caller heads (a program head can now be
     * responsible for 2+ programs, see program_head_program), else an
     * empty array.
     */
    private function programHeadProgramIds($user)
    {
        $teachingStaff = TeachingStaff::where('user_id', $user->id)
            ->where('position_id', Position::idFor('program_head'))
            ->first();

        return $teachingStaff?->programsHandled->pluck('id')->all() ?? [];
    }

    private function addFolderToZip($folder, $zip, $parentFolder = '')
    {
        $files = scandir($folder);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }

            $filePath = "$folder/$file";
            $localPath = $parentFolder ? "$parentFolder/$file" : $file;

            if (is_dir($filePath)) {
                $zip->addEmptyDir($localPath);
                self::addFolderToZip($filePath, $zip, $localPath);
            } else {
                $zip->addFile($filePath, $localPath);
            }
        }
    }

    public function getUserAccountZipFileList()
    {
        return response()->json(self::scopedAccountFiles());
    }

    /**
     * The default-account files the current user is allowed to see: every
     * file for super_admin/sub_admin, only their own program's for a
     * program head. Shared by the API listing above and by controllers
     * (e.g. AccountController) that need this as an Inertia page prop
     * instead of a separate api call.
     */
    public static function scopedAccountFiles()
    {
        $user = auth()->user();

        if (! in_array($user->role, ['super_admin', 'sub_admin', 'teaching_staff'])) {
            abort(403);
        }

        $programIds = ($user->role === 'teaching_staff') ? (new self)->programHeadProgramIds($user) : null;

        if ($user->role === 'teaching_staff' && empty($programIds)) {
            abort(403);
        }

        $files = Storage::disk('local')->files('zips');
        $csvFiles = array_filter($files, function ($file) use ($programIds) {
            $fileInfo = pathinfo($file, PATHINFO_EXTENSION);

            if ($fileInfo !== 'zip' && $fileInfo !== 'csv') {
                return false;
            }

            if ($programIds === null) {
                return true;
            }

            $pattern = '/^(student|faculty-account)-('.implode('|', array_map('preg_quote', $programIds)).')-/';

            return (bool) preg_match($pattern, basename($file));
        });

        $fileDetails = array_map(function ($file) {
            return [
                'name' => basename($file),
                'path' => $file,
                'size' => Storage::disk('local')->size($file),
                'last_modified' => date('F d Y H:i:s', Storage::disk('local')->lastModified($file)),
            ];
        }, $csvFiles);

        return array_values($fileDetails);
    }

    public function generatePDFEvidence($fileName, $placeHolderList, $output)
    {

        $caseNumber = $placeHolderList['case-number'];

        if ($placeHolderList['image_block']) {
            $data = [
                'case_number' => $caseNumber,
                'img_list' => $placeHolderList['image_block'],
            ];
            $pdf = Pdf::loadView('pdf.evidence', $data);
            $p = str_replace('.docx', '.pdf', $output);

            $pdf->download("$fileName.pdf");
            $pdf->save($p);
        }
    }

    public function generateDocx($templatePath, $output, $placeHolderList)
    {
        $template = new TemplateProcessor($templatePath);

        foreach ($placeHolderList as $key => $plc) {
            if ($plc != null) {
                $template->setValue($key, $plc);
            }
        }

        $template->saveAs($output);
        response()->download($output);

        return response()->json(['status' => 'success']);
    }

    public function printFile($filePath)
    {
        $pdfPath = str_replace('.docx', '.pdf', $filePath);

        Settings::setPdfRendererName(Settings::PDF_RENDERER_DOMPDF);
        Settings::setPdfRendererPath(base_path('vendor/dompdf/dompdf'));

        $phpWord = IOFactory::load($filePath);
        $pdfWriter = IOFactory::createWriter($phpWord, 'PDF');
        $pdfWriter->save($pdfPath);

        return response()->file($pdfPath);
    }

    public function generatePDF($type = '', $view = '', $fileName = '', $placeHolderList = [], $output = '')
    {
        if ($type == 'evidence') {
            if ($placeHolderList['image_block']) {
                $caseNumber = $placeHolderList['id'];

                $data = [
                    'case_number' => $caseNumber,
                    'img_list' => $placeHolderList['image_block'],
                ];
                $pdf = Pdf::loadView('pdf.evidence', $data);
            } else {
                $pdf = Pdf::loadView("pdf.$view", $placeHolderList);
            }
        }
        $p = str_replace('.docx', '.pdf', $output);

        $pdf->download("$fileName.pdf");
        $pdf->save($p);

        return response()->json(['status' => 'success']);
    }

    public function destroy()
    {
        $fileName = request()->fileName;
        $filePath = "zips/$fileName";

        if (Storage::disk('local')->exists($filePath)) {
            Storage::disk('local')->delete($filePath);

            return self::getUserAccountZipFileList();
        } else {
            return response()->json(['message' => 'File not found.'], 404);
        }
    }

    public function cryptoJsAesDecrypt($jsonString)
    {
        $data = base64_decode($jsonString);

        // Check for OpenSSL-style salt prefix ("Salted__")
        $salted = substr($data, 0, 8) === 'Salted__';
        $salt = $salted ? substr($data, 8, 8) : null;
        $ciphertext = $salted ? substr($data, 16) : $data;

        if ($salted && $salt) {
            $keyIv = self::evpBytesToKey($salt);
            $key = $keyIv['key'];
            $iv = $keyIv['iv'];

            $decrypted = openssl_decrypt(
                $ciphertext,
                'AES-256-CBC',
                $key,
                OPENSSL_RAW_DATA,
                $iv
            );

            return $decrypted;
        }

        return false;
    }

    public function evpBytesToKey($salt, $keyLen = 32, $ivLen = 16)
    {
        $dtot = '';
        $d = '';
        while (strlen($dtot) < ($keyLen + $ivLen)) {
            $d = md5($d.'gh4mdvcf'.$salt, true);
            $dtot .= $d;
        }

        return [
            'key' => substr($dtot, 0, $keyLen),
            'iv' => substr($dtot, $keyLen, $ivLen),
        ];
    }
}
