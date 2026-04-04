# migrate-to-supabase.ps1
# Esegui questo script nella cartella del progetto JADE
# Converte automaticamente tutte le chiamate Base44 in Supabase

Write-Host "Inizio migrazione Base44 -> Supabase..." -ForegroundColor Cyan

# Mappa entita Base44 -> tabelle Supabase
$entityMap = @{
    "AppSettings"              = "app_settings"
    "CRMAzienda"               = "crm_aziende"
    "CRMFunzioneLavorativa"    = "crm_funzioni_lavorative"
    "CRMLifecycleStage"        = "crm_lifecycle_stages"
    "CRMOpportunita"           = "crm_opportunita"
    "CRMPersona"               = "crm_persone"
    "CRMRuolo"                 = "crm_ruoli"
    "CRMTitolo"                = "crm_titoli"
    "ChecklistItem"            = "checklist_items"
    "Project"                  = "projects"
    "SectionPermission"        = "section_permissions"
    "Task"                     = "tasks"
    "TaskActivityLog"          = "task_activity_logs"
    "TaskComment"              = "task_comments"
    "TaskType"                 = "task_types"
    "Team"                     = "teams"
    "TimeEntry"                = "time_entries"
    "User"                     = "profiles"
    "UserType"                 = "user_types"
    "VenditaCategoriaRisorsa"  = "vendita_categorie_risorse"
    "VenditaOpportunita"       = "vendita_opportunita"
    "VenditaPreventivo"        = "vendita_preventivi"
    "VenditaRisorsa"           = "vendita_risorse"
    "VenditaSettings"          = "vendita_settings"
    "VenditaStatoOpportunita"  = "vendita_stati_opportunita"
    "VenditaStatoPreventivo"   = "vendita_stati_preventivi"
    "WikiCategoria"            = "wiki_categorie"
    "WikiPagina"               = "wiki_pagine"
}

$files = Get-ChildItem -Path src -Recurse -Filter *.jsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content

    # 1. Sostituisci import base44Client con supabaseClient
    $content = $content -replace 'import \{ base44 \} from ["\']@/api/base44Client["\']', 'import { supabase } from "@/api/supabaseClient"'
    $content = $content -replace 'import \{ supabase \} from ["\']@/api/base44Client["\']', 'import { supabase } from "@/api/supabaseClient"'

    # 2. Sostituisci base44.auth.me() con supabase.auth.getUser()
    $content = $content -replace 'base44\.auth\.me\(\)', 'supabase.auth.getUser().then(r => r.data.user)'
    $content = $content -replace 'supabase\.auth\.me\(\)', 'supabase.auth.getUser().then(r => r.data.user)'

    # 3. Per ogni entita, sostituisci i metodi CRUD
    foreach ($entity in $entityMap.Keys) {
        $table = $entityMap[$entity]

        # .list("-created_date", N) -> .from(table).select("*").order("created_at", {ascending:false}).limit(N)
        $content = $content -replace "(?:base44|supabase)\.entities\.$entity\.list\([^)]*\)", "supabase.from('$table').select('*').order('created_at', { ascending: false }).limit(100).then(r => r.data || [])"

        # .get(id) -> .from(table).select("*").eq("id", id).single()
        $content = $content -replace "(?:base44|supabase)\.entities\.$entity\.get\(([^)]+)\)", "supabase.from('$table').select('*').eq('id', `$1`).single().then(r => r.data)"

        # .create(data) -> .from(table).insert(data).select().single()
        $content = $content -replace "(?:base44|supabase)\.entities\.$entity\.create\(([^)]+)\)", "supabase.from('$table').insert(`$1`).select().single().then(r => r.data)"

        # .update(id, data) -> .from(table).update(data).eq("id", id).select().single()
        $content = $content -replace "(?:base44|supabase)\.entities\.$entity\.update\(([^,]+),\s*([^)]+)\)", "supabase.from('$table').update(`$2`).eq('id', `$1`).select().single().then(r => r.data)"

        # .delete(id) -> .from(table).delete().eq("id", id)
        $content = $content -replace "(?:base44|supabase)\.entities\.$entity\.delete\(([^)]+)\)", "supabase.from('$table').delete().eq('id', `$1`)"

        # .filter(...) generico rimasto
        $content = $content -replace "(?:base44|supabase)\.entities\.$entity\b", "supabase.from('$table')"
    }

    # 4. Pulisci riferimenti rimasti a base44 generici
    $content = $content -replace 'base44\.auth\.logout[^;]*;', 'supabase.auth.signOut();'
    $content = $content -replace 'base44\.auth\.redirectToLogin[^;]*;', 'window.location.href = "/login";'

    if ($content -ne $original) {
        Set-Content $file.FullName $content
        Write-Host "  Aggiornato: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Migrazione completata!" -ForegroundColor Cyan
Write-Host "Riavvia il server con: npm run dev" -ForegroundColor Yellow
