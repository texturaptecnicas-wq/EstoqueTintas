import { supabase } from '@/lib/customSupabaseClient';

export const verifyPriceHistory = async (productId, productName) => {
  console.log(`\n===========================================`);
  console.log(`[DEBUG] Fetching Price History for Product:`);
  console.log(`Name: ${productName}`);
  console.log(`ID: ${productId}`);
  console.log(`===========================================\n`);

  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .order('date', { ascending: false });

    if (error) {
      console.error(`[DEBUG ERROR] Failed to fetch price history:`, error);
      return;
    }

    if (!data || data.length === 0) {
      console.warn(`[DEBUG WARNING] No price history records found for this product.`);
      return;
    }

    console.log(`[DEBUG] Found ${data.length} price history record(s):`);
    
    data.forEach((record, index) => {
      console.log(`\n--- Record #${index + 1} ---`);
      console.log(`  Date:        ${new Date(record.date).toLocaleString('pt-BR')}`);
      console.log(`  Column Key:  ${record.column_key}`);
      console.log(`  Old Price:   ${record.old_price}`);
      console.log(`  New Price:   ${record.price}`);
      console.log(`  Variation:   ${record.variation !== null ? Number(record.variation).toFixed(2) + '%' : 'N/A'}`);
      
      // Verify required fields
      const missingFields = [];
      if (!record.id) missingFields.push('id');
      if (!record.product_id) missingFields.push('product_id');
      if (record.price === null || record.price === undefined) missingFields.push('price');
      if (record.old_price === null || record.old_price === undefined) missingFields.push('old_price');
      if (record.variation === null || record.variation === undefined) missingFields.push('variation');
      if (!record.date) missingFields.push('date');
      if (!record.column_key) missingFields.push('column_key');

      if (missingFields.length > 0) {
        console.error(`  [!] MISSING REQUIRED FIELDS: ${missingFields.join(', ')}`);
      } else {
        console.log(`  [+] All required fields are present.`);
      }
    });
    
    console.log(`\n===========================================\n`);
    
  } catch (err) {
    console.error(`[DEBUG EXCEPTION] Error in verifyPriceHistory:`, err);
  }
};