/**
 * O Jest define NODE_ENV=test por padrão; o ConfigModule da API só aceita dev | prod.
 * Sem isso o bootstrap do AppModule falha nos testes e2e.
 */
process.env.NODE_ENV = 'dev';
