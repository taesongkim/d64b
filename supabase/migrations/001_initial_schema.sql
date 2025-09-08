-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create commitments table  
CREATE TABLE commitments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#007AFF',
  target_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create commitment_records table
CREATE TABLE commitment_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  commitment_id UUID REFERENCES commitments(id) ON DELETE CASCADE NOT NULL,
  completed_at DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commitment_id, completed_at)
);

-- Create offline_queue table
CREATE TABLE offline_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commitments_updated_at 
  BEFORE UPDATE ON commitments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Commitments policies
CREATE POLICY "Users can view own commitments" ON commitments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own commitments" ON commitments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commitments" ON commitments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own commitments" ON commitments
  FOR DELETE USING (auth.uid() = user_id);

-- Commitment records policies
CREATE POLICY "Users can view own commitment records" ON commitment_records
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM commitments WHERE id = commitment_records.commitment_id
    )
  );

CREATE POLICY "Users can insert own commitment records" ON commitment_records
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM commitments WHERE id = commitment_records.commitment_id
    )
  );

CREATE POLICY "Users can delete own commitment records" ON commitment_records
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM commitments WHERE id = commitment_records.commitment_id
    )
  );

-- Offline queue policies (users can manage their own queue)
CREATE POLICY "Users can view own offline queue" ON offline_queue
  FOR SELECT USING (true); -- Allow all authenticated users for now

CREATE POLICY "Users can insert into offline queue" ON offline_queue
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update offline queue" ON offline_queue
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete from offline queue" ON offline_queue
  FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_commitments_user_id ON commitments(user_id);
CREATE INDEX idx_commitments_active ON commitments(user_id, is_active);
CREATE INDEX idx_commitment_records_commitment_id ON commitment_records(commitment_id);
CREATE INDEX idx_commitment_records_date ON commitment_records(commitment_id, completed_at);
CREATE INDEX idx_offline_queue_created_at ON offline_queue(created_at);