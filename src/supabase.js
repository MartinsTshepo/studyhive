import { createClient } from '@supabase/supabase-js'

const SUPA_URL = "https://qdfszcklnvrfxhyqsugx.supabase.co"
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZnN6Y2tsbnZyZnhoeXFzdWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjU5NjEsImV4cCI6MjA5NDg0MTk2MX0.njgBCzsrjjB-QsRb5PQMYMFegswCpKDHZ4oGUaYoZZA"

export const supabase = createClient(SUPA_URL, SUPA_KEY)