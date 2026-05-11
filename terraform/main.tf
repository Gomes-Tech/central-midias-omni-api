locals {
  network_name = var.project_name
  # Hostname igual ao compose: o serviço chama-se "postgres".
  postgres_host = "postgres"

  database_url = format(
    "postgresql://%s:%s@%s:5432/%s",
    var.postgres_user,
    var.postgres_password,
    local.postgres_host,
    var.postgres_db
  )

  app_env = merge(
    {
      DATABASE_URL = local.database_url
      NODE_ENV     = "prod"
    },
    var.app_environment
  )
}

resource "docker_network" "stack" {
  name = local.network_name
}

resource "docker_volume" "pgdata" {
  name = var.pgdata_volume_name
}

resource "docker_image" "postgres" {
  name = var.postgres_image
}

resource "docker_image" "app" {
  name = "${var.app_image_name}:latest"
  build {
    context    = abspath("${path.module}/..")
    dockerfile = "Dockerfile"
  }

  triggers = {
    dockerfile_sha = try(filesha256(abspath("${path.module}/../Dockerfile")), "")
    yarn_lock_sha  = try(filesha256(abspath("${path.module}/../yarn.lock")), "")
    package_sha    = try(filesha256(abspath("${path.module}/../package.json")), "")
  }
}

resource "docker_container" "postgres" {
  name  = "${var.project_name}-postgres"
  image = docker_image.postgres.image_id

  hostname = local.postgres_host
  restart  = "unless-stopped"

  shm_size = 268435456 # 256m (equivale ao shm_size do compose)

  env = compact([
    "POSTGRES_DB=${var.postgres_db}",
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}",
    "PGDATA=/var/lib/postgresql/data",
  ])

  mounts {
    source = docker_volume.pgdata.name
    target = "/var/lib/postgresql/data"
    type   = "volume"
  }

  networks_advanced {
    name    = docker_network.stack.name
    aliases = [local.postgres_host]
  }

  healthcheck {
    test = [
      "CMD-SHELL",
      "pg_isready -U ${var.postgres_user} -d ${var.postgres_db}",
    ]
    interval     = "5s"
    timeout      = "3s"
    retries      = 30
    start_period = "10s"
  }
}

resource "docker_container" "app" {
  name  = "${var.project_name}-app"
  image = docker_image.app.image_id

  restart = "unless-stopped"

  depends_on = [docker_container.postgres]

  ports {
    internal = var.app_port
    external = var.app_port
  }

  dynamic "env" {
    for_each = local.app_env
    iterator = e
    content {
      name  = e.key
      value = e.value
    }
  }

  networks_advanced {
    name = docker_network.stack.name
  }

  healthcheck {
    test = [
      "CMD-SHELL",
      "wget --quiet --tries=1 --spider http://127.0.0.1:${var.app_port}/api/health || curl -sf http://127.0.0.1:${var.app_port}/api/health || exit 1",
    ]
    interval     = "30s"
    timeout      = "10s"
    retries      = 3
    start_period = "40s"
  }
}
