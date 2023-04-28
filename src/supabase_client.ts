import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gwvygmykvmtaduexvgmv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dnlnbXlrdm10YWR1ZXh2Z212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODI0MzY0OTQsImV4cCI6MTk5ODAxMjQ5NH0.Hx8tnfuVc_eiKPPF9nrHLoWKn-wx__PPxtDtHO8D7bc";

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
