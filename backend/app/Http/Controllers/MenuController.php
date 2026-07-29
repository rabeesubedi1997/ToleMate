<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Menu;

class MenuController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = $user?->role;

        $menus = Menu::active()->forRole($role)
            ->whereNull('parent_id')
            ->with(['children' => fn($q) => $q->active()->forRole($role)->orderBy('order')])
            ->orderBy('order')
            ->get();

        return response()->json($menus);
    }

    public function all(Request $request)
    {
        return response()->json(Menu::with('children')->orderBy('order')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'label' => 'required|string|max:255',
            'path' => 'required|string|max:500',
            'icon' => 'nullable|string|max:50',
            'order' => 'nullable|integer|min:0',
            'parent_id' => 'nullable|exists:menus,id',
            'is_active' => 'nullable|boolean',
            'role' => 'nullable|string|max:50',
        ]);

        $menu = Menu::create($request->all());
        return response()->json($menu, 201);
    }

    public function update(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);
        $request->validate([
            'label' => 'required|string|max:255',
            'path' => 'required|string|max:500',
            'icon' => 'nullable|string|max:50',
            'order' => 'nullable|integer|min:0',
            'parent_id' => 'nullable|exists:menus,id',
            'is_active' => 'nullable|boolean',
            'role' => 'nullable|string|max:50',
        ]);
        $menu->update($request->all());
        return response()->json($menu);
    }

    public function destroy($id)
    {
        Menu::destroy($id);
        return response()->json(['message' => 'Menu deleted']);
    }
}
