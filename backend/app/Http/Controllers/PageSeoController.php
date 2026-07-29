<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PageSeo;

class PageSeoController extends Controller
{
    public function index()
    {
        return response()->json(PageSeo::all());
    }

    public function show($page)
    {
        $seo = PageSeo::where('page', $page)->first();
        if (!$seo) return response()->json(null, 204);
        return response()->json($seo);
    }

    public function store(Request $request)
    {
        $request->validate([
            'page' => 'required|string|max:255|unique:page_seo,page',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'keywords' => 'nullable|string',
            'og_image' => 'nullable|string|max:500',
            'no_index' => 'nullable|boolean',
        ]);

        $seo = PageSeo::create($request->all());
        return response()->json($seo, 201);
    }

    public function update(Request $request, $id)
    {
        $seo = PageSeo::findOrFail($id);
        $request->validate([
            'page' => 'required|string|max:255|unique:page_seo,page,' . $id,
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'keywords' => 'nullable|string',
            'og_image' => 'nullable|string|max:500',
            'no_index' => 'nullable|boolean',
        ]);
        $seo->update($request->all());
        return response()->json($seo);
    }

    public function destroy($id)
    {
        PageSeo::destroy($id);
        return response()->json(['message' => 'Page SEO deleted']);
    }
}
