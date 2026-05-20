<?php

namespace App\Http\Controllers;

use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MediaController extends Controller
{
    /**
     * List all media (Admin only)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $user->role !== 'vendor') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $media = Media::orderBy('created_at', 'desc')->paginate(20);
        return response()->json($media);
    }

    /**
     * Upload a new media file (Admin only)
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $user->role !== 'vendor') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:jpg,jpeg,png,webp,svg,gif|max:5120', // Max 5MB
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $fileName = time() . '_' . $file->getClientOriginalName();
        
        // Ensure directory exists
        if (!Storage::disk('public')->exists('media')) {
            Storage::disk('public')->makeDirectory('media');
        }

        $filePath = $file->storeAs('media', $fileName, 'public');
        
        $media = Media::create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => '/storage/' . $filePath,
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Media uploaded successfully',
            'media' => $media
        ], 201);
    }

    /**
     * Delete media file (Admin only)
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $user->role !== 'vendor') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $media = Media::find($id);
        if (!$media) {
            return response()->json(['message' => 'Media not found'], 404);
        }

        // Delete from storage
        $relativePath = str_replace('/storage/', 'public/', $media->file_path);
        Storage::delete($relativePath);
        
        $media->delete();

        return response()->json(['message' => 'Media deleted successfully']);
    }
}
