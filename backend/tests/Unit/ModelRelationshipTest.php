<?php

namespace Tests\Unit;

use App\Models\Account;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\SaleBatchAllocation;
use App\Models\SaleDetail;
use App\Models\SalesBooking;
use App\Models\ServiceMaster;
use App\Models\StockMovement;
use App\Models\Supplier;
use Tests\TestCase;

class ModelRelationshipTest extends TestCase
{
    public function test_all_fourteen_models_can_be_instantiated(): void
    {
        $this->assertInstanceOf(Product::class, new Product());
        $this->assertInstanceOf(ProductBatch::class, new ProductBatch());
        $this->assertInstanceOf(ServiceMaster::class, new ServiceMaster());
        $this->assertInstanceOf(Supplier::class, new Supplier());
        $this->assertInstanceOf(Sale::class, new Sale());
        $this->assertInstanceOf(SaleDetail::class, new SaleDetail());
        $this->assertInstanceOf(SaleBatchAllocation::class, new SaleBatchAllocation());
        $this->assertInstanceOf(SalesBooking::class, new SalesBooking());
        $this->assertInstanceOf(StockMovement::class, new StockMovement());
        $this->assertInstanceOf(ExpenseCategory::class, new ExpenseCategory());
        $this->assertInstanceOf(Expense::class, new Expense());
        $this->assertInstanceOf(Account::class, new Account());
        $this->assertInstanceOf(JournalEntry::class, new JournalEntry());
        $this->assertInstanceOf(JournalItem::class, new JournalItem());
    }

    public function test_account_coa_table_has_accounts(): void
    {
        $count = Account::count();
        $this->assertGreaterThanOrEqual(15, $count);
    }
}
