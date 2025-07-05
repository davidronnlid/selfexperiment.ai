#!/bin/bash

# Enhanced Variables System Database Migration Script
# This script migrates your existing SelfExperiment.AI database to the new enhanced variables system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-selfexperiment}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Supabase specific
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

echo -e "${BLUE}🚀 SelfExperiment.AI Enhanced Variables System Migration${NC}"
echo "=================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    echo -e "${YELLOW}📋 Checking dependencies...${NC}"
    
    if ! command_exists psql; then
        echo -e "${RED}❌ PostgreSQL client (psql) not found. Please install it.${NC}"
        exit 1
    fi
    
    if ! command_exists supabase && [[ -n "$SUPABASE_PROJECT_REF" ]]; then
        echo -e "${YELLOW}⚠️  Supabase CLI not found. Install it for easier management.${NC}"
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Create backup
create_backup() {
    echo -e "${YELLOW}💾 Creating database backup...${NC}"
    
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if [[ -n "$SUPABASE_PROJECT_REF" ]]; then
        # Supabase backup
        echo "Creating Supabase backup..."
        supabase db dump --local > "$backup_file" 2>/dev/null || {
            echo -e "${RED}❌ Supabase backup failed. Continuing without backup.${NC}"
            return 1
        }
    else
        # Standard PostgreSQL backup
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --no-owner \
            --no-privileges \
            > "$backup_file" 2>/dev/null || {
            echo -e "${RED}❌ Database backup failed. Continuing without backup.${NC}"
            return 1
        }
    fi
    
    echo -e "${GREEN}✅ Backup created: $backup_file${NC}"
    export BACKUP_FILE="$backup_file"
}

# Execute SQL file
execute_sql() {
    local sql_file="$1"
    local description="$2"
    
    echo -e "${YELLOW}📄 $description...${NC}"
    
    if [[ -n "$SUPABASE_PROJECT_REF" ]]; then
        # Execute via Supabase
        supabase db reset --local
        cat "$sql_file" | supabase db psql --local
    else
        # Execute via psql
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -f "$sql_file"
    fi
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ $description completed${NC}"
    else
        echo -e "${RED}❌ $description failed${NC}"
        exit 1
    fi
}

# Verify migration
verify_migration() {
    echo -e "${YELLOW}🔍 Verifying migration...${NC}"
    
    local verification_sql="
    -- Check if new tables exist
    SELECT 
        'variables' as table_name,
        count(*) as record_count
    FROM variables
    WHERE is_predefined = true
    
    UNION ALL
    
    SELECT 
        'units' as table_name,
        count(*) as record_count  
    FROM units
    
    UNION ALL
    
    SELECT
        'unit_groups' as table_name,
        count(*) as record_count
    FROM unit_groups;
    "
    
    if [[ -n "$SUPABASE_PROJECT_REF" ]]; then
        echo "$verification_sql" | supabase db psql --local
    else
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "$verification_sql"
    fi
    
    echo -e "${GREEN}✅ Migration verification completed${NC}"
}

# Rollback function
rollback() {
    echo -e "${RED}🔄 Rolling back changes...${NC}"
    
    if [[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]]; then
        echo "Restoring from backup: $BACKUP_FILE"
        
        if [[ -n "$SUPABASE_PROJECT_REF" ]]; then
            supabase db reset --local
            cat "$BACKUP_FILE" | supabase db psql --local
        else
            PGPASSWORD="$DB_PASSWORD" psql \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                < "$BACKUP_FILE"
        fi
        
        echo -e "${GREEN}✅ Rollback completed${NC}"
    else
        echo -e "${RED}❌ No backup file available for rollback${NC}"
    fi
}

# Trap errors and rollback
trap 'echo -e "${RED}❌ Migration failed. Attempting rollback...${NC}"; rollback; exit 1' ERR

# Main migration process
main() {
    echo -e "${BLUE}Starting migration process...${NC}"
    
    # Step 1: Check dependencies
    check_dependencies
    
    # Step 2: Create backup
    create_backup
    
    # Step 3: Apply new schema
    if [[ -f "database/variables_schema.sql" ]]; then
        execute_sql "database/variables_schema.sql" "Applying enhanced variables schema"
    else
        echo -e "${RED}❌ Schema file not found: database/variables_schema.sql${NC}"
        exit 1
    fi
    
    # Step 4: Migrate existing data (if migration file exists)
    if [[ -f "database/migration_guide.md" ]]; then
        # Extract SQL from markdown file
        sed -n '/```sql/,/```/p' database/migration_guide.md | sed '1d;$d' > /tmp/migrate_data.sql
        execute_sql "/tmp/migrate_data.sql" "Migrating existing daily logs"
        rm -f /tmp/migrate_data.sql
    fi
    
    # Step 5: Verify migration
    verify_migration
    
    echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Update your application to use the new variables system"
    echo "2. Test the enhanced input components"
    echo "3. Configure user unit preferences"
    echo "4. Monitor performance with the new indexes"
    echo ""
    echo -e "${YELLOW}Backup file: ${BACKUP_FILE:-"No backup created"}${NC}"
}

# Handle command line arguments
case "${1:-}" in
    "rollback")
        rollback
        ;;
    "verify")
        verify_migration
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Run full migration"
        echo "  rollback   Restore from backup"
        echo "  verify     Verify migration status"
        echo "  help       Show this help"
        echo ""
        echo "Environment variables:"
        echo "  DB_NAME              Database name (default: selfexperiment)"
        echo "  DB_USER              Database user (default: postgres)"
        echo "  DB_HOST              Database host (default: localhost)"
        echo "  DB_PORT              Database port (default: 5432)"
        echo "  DB_PASSWORD          Database password"
        echo "  SUPABASE_PROJECT_REF Supabase project reference (if using Supabase)"
        ;;
    *)
        main
        ;;
esac