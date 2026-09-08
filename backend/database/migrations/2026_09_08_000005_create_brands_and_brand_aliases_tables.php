<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('brands')) {
            Schema::create('brands', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->boolean('is_partner')->default(false);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('brand_aliases')) {
            Schema::create('brand_aliases', function (Blueprint $table) {
                $table->id();
                $table->string('alias')->unique();
                $table->unsignedBigInteger('brand_id')->index();
                $table->timestamps();

                $table->foreign('brand_id')->references('id')->on('brands')->onDelete('cascade');
            });
        }

        // Seed brands from ProjectOmahBan
        $brands = [
            ['id' => 1, 'name' => 'Achilles', 'is_partner' => true],
            ['id' => 2, 'name' => 'Bridgestone', 'is_partner' => true],
            ['id' => 3, 'name' => 'GT', 'is_partner' => true],
            ['id' => 4, 'name' => 'Swallow', 'is_partner' => false],
            ['id' => 5, 'name' => 'Aeolus', 'is_partner' => false],
            ['id' => 6, 'name' => 'Delli', 'is_partner' => false],
            ['id' => 7, 'name' => 'Sliwer', 'is_partner' => false],
            ['id' => 8, 'name' => 'Dunlop', 'is_partner' => true],
            ['id' => 9, 'name' => 'Accelera', 'is_partner' => true],
            ['id' => 10, 'name' => 'Forceum', 'is_partner' => false],
            ['id' => 11, 'name' => 'Hankook', 'is_partner' => true],
            ['id' => 12, 'name' => 'Delium', 'is_partner' => true],
            ['id' => 13, 'name' => 'Goodyear', 'is_partner' => false],
            ['id' => 14, 'name' => 'Sailun', 'is_partner' => false],
            ['id' => 15, 'name' => 'Heida', 'is_partner' => false],
            ['id' => 16, 'name' => 'Falken', 'is_partner' => false],
            ['id' => 17, 'name' => 'Pirelli', 'is_partner' => false],
            ['id' => 18, 'name' => 'Yokohama', 'is_partner' => false],
            ['id' => 19, 'name' => 'Uniroyal', 'is_partner' => false],
            ['id' => 20, 'name' => 'BF Goodrich', 'is_partner' => false],
            ['id' => 21, 'name' => 'Continental', 'is_partner' => false],
            ['id' => 22, 'name' => 'Federal', 'is_partner' => false],
            ['id' => 23, 'name' => 'Michellin', 'is_partner' => false],
            ['id' => 24, 'name' => 'mi', 'is_partner' => false],
            ['id' => 25, 'name' => 'Avantek', 'is_partner' => false],
            ['id' => 26, 'name' => '-', 'is_partner' => false],
            ['id' => 27, 'name' => 'Toyo', 'is_partner' => false],
            ['id' => 28, 'name' => 'Simex', 'is_partner' => false],
            ['id' => 29, 'name' => 'Laufenn', 'is_partner' => false],
            ['id' => 30, 'name' => 'Venom', 'is_partner' => false],
        ];

        foreach ($brands as $brand) {
            DB::table('brands')->updateOrInsert(
                ['name' => $brand['name']],
                [
                    'id' => $brand['id'],
                    'is_partner' => $brand['is_partner'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // Seed brand aliases from ProjectOmahBan
        $aliases = [
            'bs' => 'Bridgestone',
            'bridgestone' => 'Bridgestone',
            'smr' => 'Bridgestone',
            'gt' => 'GT',
            'gt radial' => 'GT',
            'gajah' => 'GT',
            'gajah tunggal' => 'GT',
            'acc' => 'Accelera',
            'accelera' => 'Accelera',
            'acellera' => 'Accelera',
            'dunlop' => 'Dunlop',
            'dlp' => 'Dunlop',
            'delium' => 'Delium',
            'hankook' => 'Hankook',
            'delli' => 'Delli',
            'sliwer' => 'Sliwer',
            'swallow' => 'Swallow',
            'achilles' => 'Achilles',
            'goodyear' => 'Goodyear',
            'sailun' => 'Sailun',
            'pirelli' => 'Pirelli',
            'yokohama' => 'Yokohama',
            'continental' => 'Continental',
            'forceum' => 'Forceum',
            'aeolus' => 'Aeolus',
            'laufen' => 'Laufenn',
            'laufenn' => 'Laufenn',
        ];

        foreach ($aliases as $alias => $brandName) {
            $brandId = DB::table('brands')->whereRaw('LOWER(name) = ?', [strtolower($brandName)])->value('id');
            if ($brandId) {
                DB::table('brand_aliases')->updateOrInsert(
                    ['alias' => $alias],
                    [
                        'brand_id' => $brandId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_aliases');
        Schema::dropIfExists('brands');
    }
};
