<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Connects ToleMate to an externally-hosted AI agent (PersonalOps AI, or any
 * compatible "X-API-Key" chat endpoint). The connection details live in the
 * `settings` table — set from Admin > AI Agent — not in code or .env, so the
 * agent can be reconnected to a different URL/key/project at any time without
 * a deploy. The API key never reaches the browser: only this controller ever
 * sends it, server-to-server.
 */
class AiAgentController extends Controller
{
    private function config(): array
    {
        $settings = Setting::all()->pluck('value', 'key');

        return [
            'enabled' => ($settings['ai_agent_enabled'] ?? '0') === '1',
            'api_url' => rtrim((string) ($settings['ai_agent_api_url'] ?? ''), '/'),
            'api_key' => (string) ($settings['ai_agent_api_key'] ?? ''),
        ];
    }

    /**
     * Public: tells the frontend whether to render the chat widget at all.
     * Never returns the URL or key — just a yes/no.
     */
    public function status()
    {
        $config = $this->config();

        return response()->json([
            'enabled' => $config['enabled'] && $config['api_url'] !== '' && $config['api_key'] !== '',
        ]);
    }

    /**
     * Public: proxies a chat message to the connected agent. Visitors never
     * need a ToleMate login to use this — the same way the service search
     * and vendor browsing routes are public.
     */
    public function chat(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string|max:2000',
            'conversation_id' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $config = $this->config();

        if (!$config['enabled'] || $config['api_url'] === '' || $config['api_key'] === '') {
            return response()->json([
                'message' => 'The AI assistant is not connected yet. Please try again later.',
            ], 503);
        }

        try {
            // CPU-only local LLM inference can legitimately take over a
            // minute per turn, and a multi-step booking conversation can
            // need several such turns in one request (search, then check
            // availability, then book) — each up to 120s (see PersonalOps
            // AI's OLLAMA_REQUEST_TIMEOUT_SECONDS). This must stay well
            // above the worst realistic case rather than the usual ~30s.
            $response = Http::withHeaders(['X-API-Key' => $config['api_key']])
                ->timeout(280)
                ->post($config['api_url'] . '/api/v1/public/chat', [
                    'message' => $request->input('message'),
                    'conversation_id' => $request->input('conversation_id'),
                ]);
        } catch (\Throwable $e) {
            Log::warning('ai_agent.chat_unreachable', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Could not reach the AI assistant right now.'], 502);
        }

        if ($response->status() === 401) {
            Log::warning('ai_agent.chat_unauthorized');

            return response()->json(['message' => 'The AI assistant connection is misconfigured.'], 502);
        }

        if ($response->failed()) {
            Log::warning('ai_agent.chat_failed', ['status' => $response->status(), 'body' => $response->body()]);

            return response()->json(['message' => 'The AI assistant could not answer that right now.'], 502);
        }

        $data = $response->json() ?? [];

        return response()->json([
            'reply' => $data['final_response'] ?? '',
            'conversation_id' => $data['conversation_id'] ?? null,
            'status' => $data['status'] ?? 'completed',
        ]);
    }
}
