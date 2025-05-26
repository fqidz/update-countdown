#!/usr/bin/env bash

oha \
    -n 200 \
    -c 200 \
    -z 30s \
    --fps 30 \
    --method GET \
    -t 10s \
    -H "Accept-Encoding: gzip, deflate, br, zstd" \
    "http://localhost:7171/battlebit"
