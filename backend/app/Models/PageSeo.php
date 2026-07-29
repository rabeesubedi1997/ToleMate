<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageSeo extends Model
{
    protected $table = 'page_seo';

    protected $fillable = [
        'page', 'title', 'description', 'keywords', 'og_image', 'no_index',
    ];

    protected $casts = [
        'no_index' => 'boolean',
    ];
}
