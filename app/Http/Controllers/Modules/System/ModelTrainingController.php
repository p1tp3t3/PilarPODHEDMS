<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use App\Models\ActionLog;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

/**
 * System Administrator > Model Training page: status and training for the two models
 * on the private Python ML Space — the Early Intervention Violation
 * Predictor (logistic regression, retrainable from its dataset) and the
 * Complaint Context Analyzer (pretrained Word2Vec; its violation
 * embeddings get rebuilt). Every call is proxied here because the Space
 * needs the Bearer key, which never reaches the browser.
 */
class ModelTrainingController extends Controller
{
    private static function python(int $timeout = 30): PendingRequest
    {
        return Http::withoutVerifying()
            ->withHeaders(['Authorization' => 'Bearer '.config('services.python_api.key')])
            ->timeout($timeout);
    }

    private static function url(string $path): string
    {
        return rtrim(config('services.python_api.url'), '/').$path;
    }

    // Python's own error message when it gave one, else a readable fallback.
    private static function relay($response, string $fallback)
    {
        if ($response->successful()) {
            return response()->json($response->json());
        }

        $message = $response->json('message') ?? $fallback;
        if ($response->status() === 404) {
            $message = 'The Python ML service does not have this feature yet. Redeploy the python-api to the Hugging Face Space.';
        }

        return response()->json(['message' => $message], $response->status() >= 500 ? 502 : $response->status());
    }

    private static function unreachable()
    {
        return response()->json(['message' => 'The Python ML service could not be reached. It may be starting up — try again in a minute.'], 503);
    }

    public function index()
    {
        return Inertia::render('itrc/model-training');
    }

    public function status()
    {
        try {
            return self::relay(self::python()->get(self::url('/python/model/status')), 'Could not load the model status.');
        } catch (ConnectionException) {
            return self::unreachable();
        }
    }

    public function trainPredictor()
    {
        try {
            $response = self::python(300)->post(self::url('/python/model/train'));
        } catch (ConnectionException) {
            return self::unreachable();
        }

        if ($response->successful()) {
            ActionLog::log(auth()->id(), 'system', 'Retrained the Early Intervention Violation Predictor', [
                'eval' => $response->json('eval'),
            ]);
        }

        return self::relay($response, 'Training failed.');
    }

    public function uploadPredictorDataset(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:10240']);

        try {
            $response = self::python(300)
                ->attach('file', fopen($request->file('file')->getRealPath(), 'r'), 'student_violations.csv')
                ->post(self::url('/python/model/eivp/dataset'));
        } catch (ConnectionException) {
            return self::unreachable();
        }

        if ($response->successful()) {
            ActionLog::log(auth()->id(), 'system', 'Replaced the Early Intervention Violation Predictor dataset and retrained it', [
                'rows' => $response->json('model.dataset_rows'),
                'eval' => $response->json('eval'),
            ]);
        }

        return self::relay($response, 'The dataset could not be uploaded.');
    }

    public function downloadPredictorDataset()
    {
        try {
            $response = self::python(60)->get(self::url('/python/model/eivp/dataset'));
        } catch (ConnectionException) {
            return self::unreachable();
        }

        if ($response->failed()) {
            return self::relay($response, 'The dataset could not be downloaded.');
        }

        return response($response->body(), 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="student_violations-'.now()->format('Y-m-d').'.csv"',
        ]);
    }

    public function rebuildAnalyzer()
    {
        try {
            $response = self::python(300)->post(self::url('/python/model/cca/rebuild'));
        } catch (ConnectionException) {
            return self::unreachable();
        }

        if ($response->successful()) {
            ActionLog::log(auth()->id(), 'system', 'Rebuilt the Complaint Context Analyzer violation embeddings');
        }

        return self::relay($response, 'Rebuilding the embeddings failed.');
    }

    // Try the analyzer on sample complaint text (nothing is saved).
    public function testAnalyzer(Request $request)
    {
        $data = $request->validate(['complaint_text' => 'required|string|max:5000']);

        try {
            return self::relay(
                self::python(60)->post(self::url('/python/complaint/context'), ['complaint_text' => $data['complaint_text']]),
                'The analyzer could not process this text.'
            );
        } catch (ConnectionException) {
            return self::unreachable();
        }
    }
}
