#!/bin/sh

ssh -i ./minha-chave-nova.pem \
-L 5434:database-1.c8h8qw4wojth.us-east-1.rds.amazonaws.com:5432 \
ec2-user@34.201.17.53
