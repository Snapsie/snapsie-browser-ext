import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qepuygyikxybmgcgliia.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcHV5Z3lpa3h5Ym1nY2dsaWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODE2MzE0ODMsImV4cCI6MTk5NzIwNzQ4M30.qmh8zVLxInn1dTWdtAP40Zjdc4WBUp5QgWBRQJxp6oE";

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
