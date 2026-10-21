# Category Isolation Analysis Report

## Current Category Identification and Structure
The application manages categories via the `categories` table. Each category acts as an isolated workspace. The state is driven by `currentCategory` in `HomePage.jsx`, which dictates the active `categoryId`. 

## Data Flows and State Management per Category

### 1. Products and Data
- **Hook:** `useProducts(categoryId)`
- **Query:** `supabase.from('products').select('*').eq('category_id', categoryId)`
- **Realtime:** Filters incoming payloads by checking `payload.new.category_id === categoryId`.
- **Isolation:** Excellent. Products are strictly bound to `category_id`.

### 2. Cell Painting and Color Legends
- **Hooks:** `useColorLegends(categoryId)`, `useCellColors(categoryId)`
- **Color Legends:** Bound to the `color_legends` table via `category_type`. Legends created in Category A are not visible in Category B.
- **Cell Colors:** Bound to the `cell_colors` table. Fetched by joining `products` and filtering by `category_id`.

### 3. Caixa Aberta and Meia Caixa
- **State:** Stored within the `products` table directly (`caixa_aberta`, `meia_caixa`, `meia_caixa_status`).
- **Isolation:** Inherently isolated since they are bound to the product, which is bound to the category.

### 4. Price History
- **State:** Stored in `price_history` table, linked via `product_id`.
- **Isolation:** Inherently isolated by the product relationship.

### 5. Edit States and Drag-Drop States
- **Drag & Drop:** `DragDropManager` uses localStorage keys suffixed with `-${categoryId}` (e.g., `erp-row-order-1234`). Order is isolated per category.
- **Edit States:** Managed locally in `ProductTable.jsx`. When switching categories, remounting the component clears edit states.

### 6. Search and Filter States
- **State:** `searchQuery` and `debouncedSearch` in `HomePage.jsx`.
- **Isolation:** Cleared when switching categories via `key` props or explicit state resets.

### 7. Shared State Contexts
- **PaintingModeContext:** Tracks the active painting legend. When the category changes, this context must be explicitly cleared to prevent cross-contamination.
- **DragDropManager:** Tied to `categoryId`. Automatically loads/saves specific keys based on the active category.

## Conclusion
The architecture heavily relies on passing `categoryId` to hooks and components. By enforcing `key={currentCategory.id}` on main workspace components, we guarantee React unmounts and remounts local states, eliminating memory leaks across categories. Database-level row-level security (RLS) or strict `.eq()` filters ensure network-level isolation.