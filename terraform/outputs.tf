output "app_url" {
  description = "URL local da API (porta host = app_port)."
  value       = "http://localhost:${var.app_port}"
}

output "postgres_container_name" {
  description = "Nome do container Postgres na rede Docker."
  value       = docker_container.postgres.name
}
