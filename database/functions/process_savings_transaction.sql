-- Function to process savings transactions with validation
CREATE OR REPLACE FUNCTION process_savings_transaction(
  p_member_id UUID,
  p_tenant_id UUID,
  p_transaction_type VARCHAR,
  p_savings_type VARCHAR,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL,
  p_payment_method VARCHAR DEFAULT 'cash',
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_account_id UUID;
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
  v_total_balance DECIMAL;
  v_transaction_code VARCHAR;
  v_transaction_id UUID;
  v_account_number VARCHAR;
BEGIN
  -- Get or create savings account
  SELECT id, account_number,
         CASE p_savings_type
           WHEN 'pokok' THEN pokok_balance
           WHEN 'wajib' THEN wajib_balance
           WHEN 'sukarela' THEN sukarela_balance
         END as current_balance
  INTO v_account_id, v_account_number, v_current_balance
  FROM savings_accounts
  WHERE member_id = p_member_id;

  -- Create account if doesn't exist
  IF v_account_id IS NULL THEN
    INSERT INTO savings_accounts (
      member_id, tenant_id, account_number, 
      pokok_balance, wajib_balance, sukarela_balance, total_balance
    ) VALUES (
      p_member_id, p_tenant_id, 'SAV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
      0, 0, 0, 0
    ) RETURNING id, account_number INTO v_account_id, v_account_number;
    
    v_current_balance := 0;
  END IF;

  -- Validate transaction
  IF p_amount <= 0 THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Jumlah transaksi harus lebih dari 0');
  END IF;

  IF p_transaction_type = 'withdrawal' AND p_savings_type = 'pokok' THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Simpanan pokok tidak dapat ditarik');
  END IF;

  IF (p_transaction_type = 'withdrawal' OR p_transaction_type = 'transfer') AND p_amount > v_current_balance THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Saldo tidak mencukupi');
  END IF;

  -- Calculate new balance
  v_new_balance := CASE p_transaction_type
    WHEN 'deposit' THEN v_current_balance + p_amount
    WHEN 'withdrawal' THEN v_current_balance - p_amount
    WHEN 'transfer' THEN v_current_balance - p_amount
    ELSE v_current_balance
  END;

  -- Generate transaction code
  v_transaction_code := 'TRX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Insert transaction record
  INSERT INTO savings_transactions (
    member_id, tenant_id, transaction_code, transaction_type, savings_type,
    amount, balance_before, balance_after, description, payment_method,
    created_by, transaction_date
  ) VALUES (
    p_member_id, p_tenant_id, v_transaction_code, p_transaction_type, p_savings_type,
    p_amount, v_current_balance, v_new_balance, p_description, p_payment_method,
    COALESCE(p_created_by, p_member_id), NOW()
  ) RETURNING id INTO v_transaction_id;

  -- Update savings account balance
  IF p_savings_type = 'pokok' THEN
    UPDATE savings_accounts SET pokok_balance = v_new_balance WHERE id = v_account_id;
  ELSIF p_savings_type = 'wajib' THEN
    UPDATE savings_accounts SET wajib_balance = v_new_balance WHERE id = v_account_id;
  ELSIF p_savings_type = 'sukarela' THEN
    UPDATE savings_accounts SET sukarela_balance = v_new_balance WHERE id = v_account_id;
  END IF;

  -- Calculate and update total balance
  SELECT pokok_balance + wajib_balance + sukarela_balance
  INTO v_total_balance
  FROM savings_accounts
  WHERE id = v_account_id;

  UPDATE savings_accounts SET 
    total_balance = v_total_balance,
    last_transaction_date = NOW(),
    updated_at = NOW()
  WHERE id = v_account_id;

  -- Return success response
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'transaction_id', v_transaction_id,
    'transaction_code', v_transaction_code,
    'account_number', v_account_number,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'total_balance', v_total_balance
  );

EXCEPTION WHEN OTHERS THEN
  RETURN JSON_BUILD_OBJECT('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;