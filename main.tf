# =====================================================
# FORENSIC LINK ANALYSIS SYSTEM
# Phase 1: Azure Infrastructure (Terraform)
# =====================================================

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85.0"
    }
  }
  
  # Backend configuration for state storage
  # backend "azurerm" {
  #   resource_group_name  = "rg-terraform-state"
  #   storage_account_name = "stterraformstate"
  #   container_name       = "tfstate"
  #   key                  = "forensic-link.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

# =====================================================
# VARIABLES
# =====================================================

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "southeastasia"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "forensic-link"
}

variable "sql_admin_username" {
  description = "SQL Server admin username"
  type        = string
  default     = "sqladmin"
}

variable "sql_admin_password" {
  description = "SQL Server admin password"
  type        = string
  sensitive   = true
}

variable "nddb_api_url" {
  description = "NDDB API base URL"
  type        = string
  default     = "http://nddb:809"
}

variable "nddb_center_id" {
  description = "NDDB Center ID"
  type        = string
  default     = "RTP10"
}

variable "alert_email" {
  description = "Email for alerts"
  type        = string
  default     = "forensic-alerts@pfsc.go.th"
}

# =====================================================
# LOCALS
# =====================================================

locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = "Forensic Link Analysis"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Center      = "PFSC10"
  }
}

# =====================================================
# RESOURCE GROUP
# =====================================================

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.resource_prefix}"
  location = var.location
  tags     = local.common_tags
}

# =====================================================
# SQL SERVER & DATABASE
# =====================================================

resource "azurerm_mssql_server" "main" {
  name                         = "sql-${local.resource_prefix}"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
  
  tags = local.common_tags
}

resource "azurerm_mssql_database" "main" {
  name                        = "forensic_link_db"
  server_id                   = azurerm_mssql_server.main.id
  sku_name                    = "S3"  # 100 DTU
  max_size_gb                 = 250
  zone_redundant              = false
  geo_backup_enabled          = true
  storage_account_type        = "Geo"
  
  short_term_retention_policy {
    retention_days = 7
  }
  
  long_term_retention_policy {
    weekly_retention  = "P4W"
    monthly_retention = "P12M"
    yearly_retention  = "P5Y"
    week_of_year      = 1
  }
  
  tags = local.common_tags
}

# Allow Azure services
resource "azurerm_mssql_firewall_rule" "allow_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# =====================================================
# STORAGE ACCOUNT
# =====================================================

resource "azurerm_storage_account" "main" {
  name                     = "st${replace(local.resource_prefix, "-", "")}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  
  tags = local.common_tags
}

# =====================================================
# LOG ANALYTICS & APPLICATION INSIGHTS
# =====================================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  
  tags = local.common_tags
}

resource "azurerm_application_insights" "main" {
  name                = "appi-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  
  tags = local.common_tags
}

# =====================================================
# KEY VAULT
# =====================================================

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = "kv-${local.resource_prefix}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  
  tags = local.common_tags
}

resource "azurerm_key_vault_access_policy" "terraform" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id
  
  secret_permissions = [
    "Get", "List", "Set", "Delete", "Purge"
  ]
}

# Store SQL password in Key Vault
resource "azurerm_key_vault_secret" "sql_password" {
  name         = "sql-admin-password"
  value        = var.sql_admin_password
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [azurerm_key_vault_access_policy.terraform]
}

# =====================================================
# FUNCTION APP
# =====================================================

resource "azurerm_service_plan" "main" {
  name                = "asp-${local.resource_prefix}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption plan
  
  tags = local.common_tags
}

resource "azurerm_linux_function_app" "import" {
  name                       = "func-${local.resource_prefix}-import"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  service_plan_id            = azurerm_service_plan.main.id
  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  
  site_config {
    application_stack {
      node_version = "20"
    }
    
    application_insights_key               = azurerm_application_insights.main.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.main.connection_string
  }
  
  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"                = "node"
    "WEBSITE_NODE_DEFAULT_VERSION"            = "~20"
    "SQL_SERVER"                              = azurerm_mssql_server.main.fully_qualified_domain_name
    "SQL_DATABASE"                            = azurerm_mssql_database.main.name
    "SQL_USER"                                = var.sql_admin_username
    "SQL_PASSWORD"                            = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.sql_password.id})"
    "NDDB_API_BASE_URL"                       = var.nddb_api_url
    "NDDB_CENTER_ID"                          = var.nddb_center_id
    "IMPORT_BATCH_SIZE"                       = "100"
    "IMPORT_PARALLEL_BATCHES"                 = "5"
    "IMPORT_RETRY_COUNT"                      = "3"
    "APPLICATIONINSIGHTS_CONNECTION_STRING"   = azurerm_application_insights.main.connection_string
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = local.common_tags
}

# Grant Function App access to Key Vault
resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_function_app.import.identity[0].principal_id
  
  secret_permissions = [
    "Get", "List"
  ]
}

# =====================================================
# ACTION GROUP FOR ALERTS
# =====================================================

resource "azurerm_monitor_action_group" "main" {
  name                = "ag-${local.resource_prefix}"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "forensic"
  
  email_receiver {
    name                    = "admin-email"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }
  
  tags = local.common_tags
}

# =====================================================
# ALERT RULES
# =====================================================

# Alert: Import Job Failure
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "import_failure" {
  name                = "alert-import-failure"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  scopes      = [azurerm_application_insights.main.id]
  description = "Alert when import job fails"
  severity    = 1
  enabled     = true
  
  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"
  
  criteria {
    query = <<-QUERY
      customEvents
      | where name == "ImportJob"
      | where tostring(customDimensions.status) == "failed"
      | count
    QUERY
    
    time_aggregation_method = "Count"
    threshold               = 0
    operator                = "GreaterThan"
  }
  
  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }
  
  tags = local.common_tags
}

# Alert: High Error Rate
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "high_error_rate" {
  name                = "alert-high-error-rate"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  scopes      = [azurerm_application_insights.main.id]
  description = "Alert when error rate exceeds 5%"
  severity    = 2
  enabled     = true
  
  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  
  criteria {
    query = <<-QUERY
      customEvents
      | where name == "ImportJob"
      | summarize 
          total = count(),
          errors = countif(tostring(customDimensions.status) == "failed")
      | extend errorRate = 100.0 * errors / total
      | where errorRate > 5
    QUERY
    
    time_aggregation_method = "Count"
    threshold               = 0
    operator                = "GreaterThan"
  }
  
  action {
    action_groups = [azurerm_monitor_action_group.main.id]
  }
  
  tags = local.common_tags
}

# =====================================================
# OUTPUTS
# =====================================================

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "sql_server_fqdn" {
  value = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "sql_database_name" {
  value = azurerm_mssql_database.main.name
}

output "function_app_name" {
  value = azurerm_linux_function_app.import.name
}

output "function_app_hostname" {
  value = azurerm_linux_function_app.import.default_hostname
}

output "application_insights_connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

# =====================================================
# DEPLOYMENT INSTRUCTIONS
# =====================================================
# 
# 1. Initialize Terraform:
#    terraform init
#
# 2. Create terraform.tfvars:
#    sql_admin_password = "YOUR_SECURE_PASSWORD"
#    alert_email        = "your-email@example.com"
#
# 3. Plan:
#    terraform plan -out=tfplan
#
# 4. Apply:
#    terraform apply tfplan
#
# 5. After deployment, run database schema:
#    sqlcmd -S $(terraform output -raw sql_server_fqdn) \
#           -d forensic_link_db -U sqladmin -P "PASSWORD" \
#           -i ../session1.1/001_schema.sql
#
# 6. Deploy Function App:
#    cd ../session1.2/import-worker
#    func azure functionapp publish $(terraform output -raw function_app_name)
#
