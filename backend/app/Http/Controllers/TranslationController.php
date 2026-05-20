<?php

namespace App\Http\Controllers;

use App\Models\Translation;
use Illuminate\Http\Request;

class TranslationController extends Controller
{
    /**
     * Get all translations
     */
    public function index()
    {
        $translations = Translation::all();
        
        $en = $translations->pluck('en_text', 'key');
        $np = $translations->pluck('np_text', 'key');
        
        return response()->json([
            'en' => $en,
            'np' => $np,
        ]);
    }

    /**
     * Add or update a translation (Admin only)
     */
    public function store(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'key' => 'required|string|unique:translations,key',
            'en_text' => 'required|string',
            'np_text' => 'required|string',
        ]);

        $translation = Translation::create($request->all());

        return response()->json($translation, 201);
    }
}
