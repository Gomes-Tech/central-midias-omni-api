variable "project_name" {
  type        = string
  description = "Prefixo dos recursos Docker (compatível com o compose name: central-midias-api)."
  default     = "central-midias-api"
}

variable "postgres_image" {
  type        = string
  description = "Imagem Postgres (equivale ao image do serviço postgres no docker-compose)."
  default     = "postgres:18"
}

variable "postgres_db" {
  type        = string
  description = "POSTGRES_DB / nome do database."
}

variable "postgres_user" {
  type        = string
  description = "POSTGRES_USER."
}

variable "postgres_password" {
  type        = string
  description = "POSTGRES_PASSWORD. Evite caracteres reservados em URLs (:, @, /, #, ? etc.) ao usar DATABASE_URL gerada automaticamente; ou sobrescreva com app_environment."
  sensitive   = true
}

variable "pgdata_volume_name" {
  type        = string
  description = "Nome explícito do volume de dados do Postgres (central-midias-api-pgdata-v18 no compose)."
  default     = "central-midias-api-pgdata-v18"
}

variable "app_image_name" {
  type        = string
  description = "Nome da imagem construída a partir do Dockerfile (central-midias-api no compose)."
  default     = "central-midias-api"
}

variable "app_port" {
  type        = number
  description = "Porta publicada para a API (4000 no compose)."
  default     = 4000
}

variable "app_environment" {
  type        = map(string)
  description = "Variáveis extras para o container da app (substituem/sobrescrevem DATABASE_URL / NODE_ENV quando as chaves coincidirem)."
  default     = {}
}
