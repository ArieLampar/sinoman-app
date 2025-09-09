-- Function to process savings transfer between members
CREATE OR REPLACE FUNCTION process_savings_transfer(
  p_from_member_id UUID,
  p_to_member_id UUID,
  p_tenant_id UUID,
  p_savings_type VARCHAR,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_from_account_id UUID;
  v_to_account_id UUID;
  v_from_balance DECIMAL;
  v_to_balance DECIMAL;
  v_from_new_balance DECIMAL;
  v_to_new_balance DECIMAL;
  v_transaction_code VARCHAR;
  v_from_transaction_id UUID;
  v_to_transaction_id UUID;
  v_from_member_name VARCHAR;
  v_to_member_name VARCHAR;
BEGIN
  -- Get member names for transaction description
  SELECT full_name INTO v_from_member_name FROM members WHERE id = p_from_member_id;
  SELECT full_name INTO v_to_member_name FROM members WHERE id = p_to_member_id;

  -- Get source account and balance
  SELECT id,
         CASE p_savings_type
           WHEN 'pokok' THEN pokok_balance
           WHEN 'wajib' THEN wajib_balance
           WHEN 'sukarela' THEN sukarela_balance
         END as current_balance
  INTO v_from_account_id, v_from_balance
  FROM savings_accounts
  WHERE member_id = p_from_member_id;

  -- Get destination account and balance
  SELECT id,
         CASE p_savings_type
           WHEN 'pokok' THEN pokok_balance
           WHEN 'wajib' THEN wajib_balance
           WHEN 'sukarela' THEN sukarela_balance
         END as current_balance
  INTO v_to_account_id, v_to_balance
  FROM savings_accounts
  WHERE member_id = p_to_member_id;

  -- Validate source account exists
  IF v_from_account_id IS NULL THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Akun pengirim tidak ditemukan');
  END IF;

  -- Create destination account if doesn't exist
  IF v_to_account_id IS NULL THEN
    INSERT INTO savings_accounts (
      member_id, tenant_id, account_number,
      pokok_balance, wajib_balance, sukarela_balance, total_balance
    ) VALUES (
      p_to_member_id, p_tenant_id, 'SAV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
      0, 0, 0, 0
    ) RETURNING id INTO v_to_account_id;
    
    v_to_balance := 0;
  END IF;

  -- Validate transfer
  IF p_amount <= 0 THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Jumlah transfer harus lebih dari 0');
  END IF;

  IF p_amount < 10000 THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Jumlah transfer minimal Rp 10.000');
  END IF;

  IF p_savings_type = 'pokok' THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Simpanan pokok tidak dapat ditransfer');
  END IF;

  IF p_amount > v_from_balance THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Saldo pengirim tidak mencukupi');
  END IF;

  IF p_from_member_id = p_to_member_id THEN
    RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Tidak dapat transfer ke diri sendiri');
  END IF;

  -- Calculate new balances
  v_from_new_balance := v_from_balance - p_amount;
  v_to_new_balance := v_to_balance + p_amount;

  -- Generate transaction code
  v_transaction_code := 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Insert debit transaction (from sender)
  INSERT INTO savings_transactions (
    member_id, tenant_id, transaction_code, transaction_type, savings_type,
    amount, balance_before, balance_after, 
    description, payment_method, created_by, transaction_date
  ) VALUES (
    p_from_member_id, p_tenant_id, v_transaction_code || '-OUT', 'transfer', p_savings_type,
    p_amount, v_from_balance, v_from_new_balance,
    COALESCE(p_description, 'Transfer ke ' || v_to_member_name), 'savings_transfer',
    COALESCE(p_created_by, p_from_member_id), NOW()
  ) RETURNING id INTO v_from_transaction_id;

  -- Insert credit transaction (to receiver)
  INSERT INTO savings_transactions (
    member_id, tenant_id, transaction_code, transaction_type, savings_type,
    amount, balance_before, balance_after,
    description, payment_method, created_by, transaction_date
  ) VALUES (
    p_to_member_id, p_tenant_id, v_transaction_code || '-IN', 'deposit', p_savings_type,
    p_amount, v_to_balance, v_to_new_balance,
    COALESCE(p_description, 'Transfer dari ' || v_from_member_name), 'savings_transfer',
    COALESCE(p_created_by, p_from_member_id), NOW()
  ) RETURNING id INTO v_to_transaction_id;

  -- Update sender's balance
  IF p_savings_type = 'wajib' THEN
    UPDATE savings_accounts SET wajib_balance = v_from_new_balance WHERE id = v_from_account_id;
  ELSIF p_savings_type = 'sukarela' THEN
    UPDATE savings_accounts SET sukarela_balance = v_from_new_balance WHERE id = v_from_account_id;
  END IF;

  -- Update receiver's balance
  IF p_savings_type = 'wajib' THEN
    UPDATE savings_accounts SET wajib_balance = v_to_new_balance WHERE id = v_to_account_id;
  ELSIF p_savings_type = 'sukarela' THEN
    UPDATE savings_accounts SET sukarela_balance = v_to_new_balance WHERE id = v_to_account_id;
  END IF;

  -- Update total balances
  UPDATE savings_accounts SET 
    total_balance = pokok_balance + wajib_balance + sukarela_balance,
    last_transaction_date = NOW(),
    updated_at = NOW()
  WHERE id IN (v_from_account_id, v_to_account_id);

  -- Return success response
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'transaction_code', v_transaction_code,
    'from_transaction_id', v_from_transaction_id,
    'to_transaction_id', v_to_transaction_id,
    'from_balance_after', v_from_new_balance,
    'to_balance_after', v_to_new_balance,
    'from_member', v_from_member_name,
    'to_member', v_to_member_name
  );

EXCEPTION WHEN OTHERS THEN
  RETURN JSON_BUILD_OBJECT('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;